
'use server';
/**
 * @fileOverview An AI flow to identify and notify relevant project members about a new observation.
 *
 * This flow uses a tool to fetch project members and then asks the AI to determine
 * who should be notified and crafts a personalized message for each recipient.
 * If AI is disabled, it falls back to a deterministic notification system.
 *
 * - triggerSmartNotify: A function that initiates the notification process.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { SmartNotifyInput, SmartNotifyInputSchema, SmartNotifyOutputSchema, UserProfile, UserProfileSchema } from '@/lib/types';
import { adminDb } from '@/lib/firebase-admin';

// Define the schema for the tool's output. Only include necessary fields.
const MemberProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  company: z.string().optional(),
});
type MemberProfile = z.infer<typeof MemberProfileSchema>;


/**
 * Fetches all member profiles for a given project.
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
    description: 'Gets a list of all members and their profiles for a specific project.',
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
  prompt: `You are an intelligent notification routing system for an HSSE application. Your response MUST be a raw JSON object only.

Your task is to determine which project members should be notified about a new observation and craft a personalized notification for each.

First, use the 'getProjectMembers' tool to get the list of members for the project: {{{projectId}}}.

Then, analyze the observation details provided below.
- Observation Company: {{{company}}}
- Observation Findings: {{{findings}}}
- Submitted By: {{{submittedBy}}}

A member should be notified if they meet ANY of the following criteria:
1.  Their profile company (from the tool output) exactly matches the "Observation Company".
2.  Their display name (from the tool output) is mentioned anywhere in the "Observation Findings" text.

IMPORTANT: Do NOT notify the user who submitted the observation. Their name is "{{{submittedBy}}}".

For EACH member that you identify, you must generate a personalized and concise notification message in Bahasa Indonesia. The message must explain WHY the user is being notified.

Examples:
- For company match: "Perusahaan Anda, [Company Name], disebut dalam temuan baru oleh ${submittedBy}: '[findings snippet]...'"
- For name mention: "Nama Anda disebut dalam temuan baru oleh ${submittedBy}: '[findings snippet]...'"

Return a JSON object containing a list of these notifications. Each notification object in the list must have a 'uid' and a 'message'.
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
    
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';

    // Let the AI determine who to notify and generate the messages.
    const { output } = await smartNotifyPrompt(payload, { model });

    if (!output?.notifications || output.notifications.length === 0) {
      console.log(`[smartNotifyFlow] No users identified for notification for observation ${observationId}.`);
      return;
    }

    // Create a notification document for each identified user with their personalized message.
    const notificationPromises = output.notifications.map(notification => {
      const notificationData = {
        userId: notification.uid,
        observationId,
        projectId,
        message: notification.message, // Use the AI-generated message
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      return adminDb.collection('notifications').add(notificationData);
    });

    await Promise.all(notificationPromises);
    console.log(`[smartNotifyFlow] Created ${output.notifications.length} notifications for observation ${observationId}.`);
  }
);


/**
 * Sends notifications based on deterministic rules (company match, name mention).
 * This is used as a fallback when AI features are disabled for the user.
 * @param input The details of the new observation.
 */
async function sendBasicNotifications(input: SmartNotifyInput) {
  const { observationId, projectId, company, findings, submittedBy } = input;
  
  const members = await getProjectMembers(projectId);
  if (members.length === 0) return;

  const notificationsToCreate: any[] = [];
  const lowerCaseFindings = findings.toLowerCase();
  
  // Find the submitter's profile to exclude them
  const submitterProfile = members.find(m => m.displayName === submittedBy);

  for (const member of members) {
    // Don't notify the person who submitted the observation
    if (submitterProfile && member.uid === submitterProfile.uid) {
        continue;
    }

    const notifyReasons: string[] = [];
    
    // Reason 1: Company match
    if (member.company && member.company.toLowerCase() === company.toLowerCase()) {
      notifyReasons.push(`perusahaan Anda (${member.company}) disebutkan`);
    }

    // Reason 2: Name mention
    if (lowerCaseFindings.includes(member.displayName.toLowerCase())) {
      notifyReasons.push('nama Anda disebutkan');
    }

    // If there's a reason to notify, create the notification object
    if (notifyReasons.length > 0) {
      const reasonText = notifyReasons.join(' dan ');
      const message = `Anda menerima notifikasi karena ${reasonText} dalam temuan baru oleh ${submittedBy}.`;
      
      notificationsToCreate.push({
        userId: member.uid,
        observationId,
        projectId,
        message, // Use the constructed deterministic message
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Write all notifications to Firestore in a single batch operation
  if (notificationsToCreate.length > 0) {
    const batch = adminDb.batch();
    notificationsToCreate.forEach(notificationData => {
      const notificationRef = adminDb.collection('notifications').doc();
      batch.set(notificationRef, notificationData);
    });
    await batch.commit();
    console.log(`[sendBasicNotifications] Created ${notificationsToCreate.length} basic notifications for obs ${observationId}.`);
  }
}


/**
 * A server-side function to trigger the notification flow.
 * It acts as a dispatcher, choosing between the AI flow and the basic
 * deterministic flow based on the user's settings.
 * @param input - The details of the new observation.
 * @param userProfile - The profile of the user triggering the action.
 */
export async function triggerSmartNotify(input: SmartNotifyInput, userProfile: UserProfile): Promise<void> {
  // We don't wait for the flow to complete to avoid blocking the client response.
  // The chosen notification logic runs in the background.

  if (userProfile.aiEnabled) {
    // Use the intelligent, personalized AI notification flow.
    smartNotifyFlow({ payload: input, userProfile }).catch(error => {
      console.error(`[triggerSmartNotify] Failed to execute AI smart notify flow for observation ${input.observationId}:`, error);
    });
  } else {
    // Use the robust, deterministic basic notification flow.
    sendBasicNotifications(input).catch(error => {
      console.error(`[triggerSmartNotify] Failed to execute basic notification logic for observation ${input.observationId}:`, error);
    });
  }
}
