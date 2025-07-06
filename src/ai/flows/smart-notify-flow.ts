
'use server';
/**
 * @fileOverview An AI flow to identify and notify relevant project members about a new observation.
 *
 * This flow uses a tool to fetch project members and then asks the AI to determine
 * who should be notified based on the context of the observation and the roles of the members.
 * It crafts a personalized message for each recipient.
 *
 * - triggerSmartNotify: A function that initiates the notification process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SmartNotifyInput, SmartNotifyInputSchema, SmartNotifyOutputSchema, UserProfile, UserProfileSchema } from '@/lib/types';
import { adminDb } from '@/lib/firebase-admin';

// Define the schema for the tool's output. Include fields relevant for decision-making.
const MemberProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  position: z.string().optional().describe("The member's job title or position in the project."),
  company: z.string().optional().describe("The company the member works for."),
});
type MemberProfile = z.infer<typeof MemberProfileSchema>;


/**
 * Fetches all member profiles for a given project, including their positions.
 * @param projectId The ID of the project.
 * @returns An array of member profiles.
 */
async function getProjectMembers(projectId: string): Promise<MemberProfile[]> {
    try {
        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectSnap = await projectRef.get();

        if (!projectSnap.exists) {
            console.warn(`[getProjectMembers] Project not found: ${projectId}`);
            return [];
        }

        const project = projectSnap.data()!;
        const memberUids = project.memberUids || [];
        if (memberUids.length === 0) {
            return [];
        }
        
        const memberRefs = memberUids.map((uid: string) => adminDb.collection('users').doc(uid));
        const memberDocs = await adminDb.getAll(...memberRefs);

        const memberProfiles: MemberProfile[] = [];
        memberDocs.forEach(docSnap => {
            if (docSnap.exists) {
            const user = docSnap.data() as UserProfile;
            memberProfiles.push({
                uid: user.uid,
                displayName: user.displayName,
                position: user.position || 'N/A',
                company: user.company || '',
            });
            }
        });
        return memberProfiles;

    } catch (error) {
        console.error(`[getProjectMembers] Failed to fetch members for project ${projectId}:`, error);
        return []; // Return empty on error to allow the flow to continue gracefully
    }
}


/**
 * A Genkit tool to fetch member profiles for a given project.
 * The AI will use this tool to get the necessary context to make decisions.
 */
const getProjectMembersTool = ai.defineTool(
  {
    name: 'getProjectMembers',
    description: 'Gets a list of all members, including their job titles and companies, for a specific project.',
    inputSchema: z.object({ projectId: z.string() }),
    outputSchema: z.array(MemberProfileSchema),
  },
  async ({ projectId }) => getProjectMembers(projectId)
);


const smartNotifyPrompt = ai.definePrompt({
  name: 'smartNotifyPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getProjectMembersTool],
  input: { schema: SmartNotifyInputSchema },
  output: { schema: SmartNotifyOutputSchema },
  prompt: `You are an expert HSSE Project Manager. Your response MUST be a raw JSON object only.

Your task is to act as an intelligent notification router. You will decide which project members are the MOST RELEVANT to be notified about a new safety observation. Prioritize relevance and urgency over notifying everyone.

1.  First, use the 'getProjectMembers' tool to get the list of all members for the project: {{{projectId}}}.
2.  Next, analyze the observation details and the list of members (paying close attention to their 'position').
3.  Based on the context, identify up to 3 people who absolutely need to know about this.

Consider these factors for your decision:
-   **Urgency:** Is the risk level 'Critical' or 'High'? Senior roles like 'Project Manager' should be notified.
-   **Relevance:** Does the finding relate to a specific role? (e.g., 'Scaffolding' issue -> notify 'Scaffolding Supervisor'). Is a contractor's work mentioned? -> Notify their manager.
-   **Actionability:** Who is in the best position to take action or be aware of this issue?
-   **Exclusion:** Do NOT notify the user who submitted the observation. Their UID is "{{{submitterId}}}". Exclude them from your results.

For EACH person you select, craft a concise, personalized notification in Bahasa Indonesia that explains WHY they are being notified.

Example reasoning for a message:
-   "Sebagai Manajer Proyek, Anda perlu mengetahui temuan berisiko tinggi ini..."
-   "Terkait posisi Anda sebagai Supervisor Scaffolding, ada temuan tentang..."
-   "Perusahaan Anda, [Company Name], disebut dalam temuan baru oleh..."

Return a JSON object containing a list of these notifications. Each object must have a 'uid' and a 'message'. If you determine NO ONE needs to be notified (e.g., a very low-risk, minor issue), return an empty list.

Observation Details:
-   Submitted By: {{{submittedByDisplayName}}}
-   Company Involved: {{{company}}}
-   Risk Level: {{{riskLevel}}}
-   Findings: {{{findings}}}
`,
});

const smartNotifyFlow = ai.defineFlow(
  {
    name: 'smartNotifyFlow',
    inputSchema: z.object({
        payload: SmartNotifyInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: z.void(), // The flow itself doesn't return to the client, it writes to DB.
  },
  async ({ payload, userProfile }) => {
    const { observationId, projectId } = payload;
    
    // If AI is disabled for the user, do nothing.
    if (!userProfile.aiEnabled) {
      console.log(`[smartNotifyFlow] AI is disabled for user ${userProfile.uid}. Skipping notification.`);
      return;
    }

    // Let the AI determine who to notify and generate the messages.
    const { output } = await smartNotifyPrompt(payload);

    if (!output?.notifications || output.notifications.length === 0) {
      console.log(`[smartNotifyFlow] AI determined no users for notification for observation ${observationId}.`);
      return;
    }

    // Create a notification document for each identified user with their personalized message.
    const notificationPromises = output.notifications.map(notification => {
      // Basic validation to ensure the AI returns valid data
      if (!notification.uid || !notification.message) {
        console.warn('[smartNotifyFlow] AI returned a malformed notification object, skipping.', notification);
        return null;
      }
      const notificationData = {
        userId: notification.uid,
        observationId,
        projectId,
        message: notification.message, // Use the AI-generated message
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      return adminDb.collection('notifications').add(notificationData);
    }).filter(Boolean); // Filter out any null promises

    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises);
      console.log(`[smartNotifyFlow] Created ${notificationPromises.length} smart notifications for observation ${observationId}.`);
    }
  }
);


/**
 * A server-side function to trigger the notification flow.
 * This is designed to be a fire-and-forget operation from the client's perspective.
 * @param input - The details of the new observation.
 * @param userProfile - The profile of the user triggering the action.
 */
export async function triggerSmartNotify(input: SmartNotifyInput, userProfile: UserProfile): Promise<void> {
  // We don't wait for the flow to complete to avoid blocking the client response.
  // The notification logic runs in the background.
  smartNotifyFlow({ payload: input, userProfile }).catch(error => {
    console.error(`[triggerSmartNotify] Failed to execute AI smart notify flow for observation ${input.observationId}:`, error);
  });
}
