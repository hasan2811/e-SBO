
'use server';
/**
 * @fileOverview An AI flow to identify and notify relevant project members about a new observation.
 *
 * This flow uses a tool to fetch project members and then asks the AI to determine
 * who should be notified based on company and name mentions in the observation.
 *
 * - triggerSmartNotify: A function that initiates the notification process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SmartNotifyInput, SmartNotifyInputSchema, SmartNotifyOutputSchema, UserProfile } from '@/lib/types';
import { adminDb } from '@/lib/firebase-admin';

// Define the schema for the tool's output. Only include necessary fields.
const MemberProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  company: z.string().optional(),
});

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
  async ({ projectId }) => {
    try {
      const projectRef = adminDb.collection('projects').doc(projectId);
      const projectSnap = await projectRef.get();

      if (!projectSnap.exists) {
        console.warn(`[getProjectMembersTool] Project not found: ${projectId}`);
        return [];
      }

      const project = projectSnap.data()!;
      const memberUids = project.memberUids || [];
      if (memberUids.length === 0) {
        return [];
      }
      
      const memberRefs = memberUids.map((uid: string) => adminDb.collection('users').doc(uid));
      const memberDocs = await adminDb.getAll(...memberRefs);

      const memberProfiles: z.infer<typeof MemberProfileSchema>[] = [];
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
      console.error(`[getProjectMembersTool] Failed to fetch members for project ${projectId}:`, error);
      return []; // Return empty on error to allow the flow to continue gracefully
    }
  }
);


const smartNotifyPrompt = ai.definePrompt({
  name: 'smartNotifyPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getProjectMembersTool],
  input: { schema: SmartNotifyInputSchema },
  output: { schema: SmartNotifyOutputSchema },
  prompt: `You are an intelligent notification routing system for an HSSE application.
Your task is to determine which project members should be notified about a new observation.

First, use the 'getProjectMembers' tool to get the list of members for the project: {{{projectId}}}.

Then, analyze the observation details provided below.
- Observation Company: {{{company}}}
- Observation Findings: {{{findings}}}
- Submitted By: {{{submittedBy}}}

A member should be notified if they meet ANY of the following criteria:
1.  Their profile company (from the tool output) exactly matches the "Observation Company".
2.  Their display name (from the tool output) is mentioned anywhere in the "Observation Findings" text.

IMPORTANT: Do NOT notify the user who submitted the observation. Their name is "{{{submittedBy}}}".

Return a JSON object containing a list of UIDs for all the members who should be notified.
`,
});

const smartNotifyFlow = ai.defineFlow(
  {
    name: 'smartNotifyFlow',
    inputSchema: SmartNotifyInputSchema,
    outputSchema: z.void(), // The flow itself doesn't return to the client, it writes to DB.
  },
  async (input) => {
    const { observationId, projectId, findings, submittedBy } = input;
    
    // Let the AI determine who to notify.
    const { output } = await smartNotifyPrompt(input);

    if (!output?.notifiedUserUids || output.notifiedUserUids.length === 0) {
      console.log(`[smartNotifyFlow] No users identified for notification for observation ${observationId}.`);
      return;
    }

    const notificationMessage = `Anda disebut dalam temuan baru oleh ${submittedBy}: "${findings.substring(0, 50)}..."`;

    // Create a notification document for each identified user.
    const notificationPromises = output.notifiedUserUids.map(userId => {
      const notificationData = {
        userId,
        observationId,
        projectId,
        message: notificationMessage,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      return adminDb.collection('notifications').add(notificationData);
    });

    await Promise.all(notificationPromises);
    console.log(`[smartNotifyFlow] Created ${output.notifiedUserUids.length} notifications for observation ${observationId}.`);
  }
);

/**
 * A server-side function to trigger the smart notification flow.
 * This is called from the ObservationContext after a new project observation is created.
 * @param input - The details of the new observation.
 */
export async function triggerSmartNotify(input: SmartNotifyInput): Promise<void> {
  // We don't wait for the flow to complete to avoid blocking the client response.
  smartNotifyFlow(input).catch(error => {
    console.error(`[triggerSmartNotify] Failed to execute smart notify flow for observation ${input.observationId}:`, error);
  });
}
