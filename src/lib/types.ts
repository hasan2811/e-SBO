
import { z } from 'zod';

export type ObservationStatus = 'Pending' | 'In Progress' | 'Completed' | 'uploading';
export type Company = 'Tambang' | 'Migas' | 'Konstruksi' | 'Manufaktur' | string; // Allow custom strings
export type Location = 'International' | 'National' | 'Local' | 'Regional' | string; // Allow custom strings
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type Scope = 'private' | 'project';
export type InspectionStatus = 'Pass' | 'Fail' | 'Needs Repair' | 'uploading';
export type EquipmentType = 'Heavy Machinery' | 'Hand Tool' | 'Vehicle' | 'Electrical' | 'Other';
export type PtwStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed' | 'uploading';

// Centralized Constants
export const RISK_LEVELS: [RiskLevel, ...RiskLevel[]] = ['Low', 'Medium', 'High', 'Critical'];
export const OBSERVATION_STATUSES: [ObservationStatus, ...ObservationStatus[]] = ['Pending', 'In Progress', 'Completed'];
export const INSPECTION_STATUSES: [InspectionStatus, ...InspectionStatus[]] = ['Pass', 'Fail', 'Needs Repair'];
export const PTW_STATUSES: [PtwStatus, ...PtwStatus[]] = ['Pending Approval', 'Approved', 'Rejected', 'Closed'];
export const EQUIPMENT_TYPES: [EquipmentType, ...EquipmentType[]] = ['Heavy Machinery', 'Hand Tool', 'Vehicle', 'Electrical', 'Other'];
export const DEFAULT_LOCATIONS: readonly string[] = ['International', 'National', 'Local', 'Regional'];
export const DEFAULT_COMPANIES: readonly string[] = ['Tambang', 'Migas', 'Konstruksi', 'Manufaktur'];


// Default categories if a project does not define its own.
export const DEFAULT_OBSERVATION_CATEGORIES: readonly string[] = [
  'Unsafe Act',
  'Unsafe Condition',
  'Housekeeping',
  'Positive Observation',
  'Procedure Violation',
  'Tools & Equipment',
];

// This is now just a semantic alias for a string.
export type ObservationCategory = string;


export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  position: string;
  company?: string;
  photoURL?: string | null;
  photoStoragePath?: string;
  projectIds?: string[];
  aiEnabled?: boolean;
};

// Zod schema for UserProfile, useful for validating in server actions or flows
export const UserProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  position: z.string(),
  company: z.string().optional(),
  photoURL: z.string().url().nullable().optional(),
  photoStoragePath: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  aiEnabled: z.boolean().optional(),
});

export type MemberRole = {
  canApprovePtw: boolean;
  canTakeAction: boolean;
};

export type Project = {
    id: string;
    name: string;
    ownerUid: string;
    memberUids: string[];
    createdAt: string;
    isOpen?: boolean; // Controls if non-members can see it in the "Join" dialog.
    customCompanies?: string[];
    customLocations?: string[];
    customObservationCategories?: string[];
    roles?: { [uid: string]: Partial<MemberRole> }; // Role assignments for members
    // Enriched client-side
    owner?: UserProfile; 
    members?: UserProfile[];
}

export type Observation = {
  id: string;
  itemType: 'observation';
  referenceId: string; // Professional, user-facing ID
  userId: string;
  location: Location;
  submittedBy: string;
  date: string;
  findings: string;
  recommendation: string;
  riskLevel: RiskLevel;
  status: ObservationStatus;
  category: ObservationCategory;
  company: Company;
  photoUrl?: string | null;
  photoStoragePath?: string;
  scope: Scope;
  projectId: string | null;
  actionTakenDescription?: string;
  actionTakenPhotoUrl?: string;
  actionTakenPhotoStoragePath?: string;
  closedBy?: string;
  closedDate?: string;
  optimisticState?: 'uploading';
  responsiblePersonUid?: string;
  responsiblePersonName?: string;
  
  // AI Fields
  aiStatus?: 'processing' | 'completed' | 'failed' | 'n/a';
  aiSummary?: string;
  aiRisks?: string;
  aiSuggestedActions?: string;
};

export type Inspection = {
  id: string;
  itemType: 'inspection';
  referenceId: string;
  userId: string;
  submittedBy: string;
  date: string;
  location: Location;
  equipmentName: string;
  equipmentType: EquipmentType;
  findings: string; // Detailed findings from the inspection
  status: InspectionStatus;
  recommendation?: string;
  photoUrl?: string;
  photoStoragePath?: string;
  scope: Scope;
  projectId: string | null;
  optimisticState?: 'uploading';
  responsiblePersonUid?: string;
  responsiblePersonName?: string;
  aiStatus?: 'processing' | 'completed' | 'failed' | 'n/a';
  aiSummary?: string;
  aiRisks?: string;
  aiSuggestedActions?: string;
  // Fields for follow-up actions
  actionTakenDescription?: string;
  actionTakenPhotoUrl?: string;
  actionTakenPhotoStoragePath?: string;
  closedBy?: string;
  closedDate?: string;
};

export type Ptw = {
  id: string;
  itemType: 'ptw';
  referenceId: string;
  userId: string;
  submittedBy: string;
  date: string;
  location: Location;
  workDescription: string;
  contractor: string;
  jsaPdfUrl: string;
  jsaPdfStoragePath: string;
  stampedPdfUrl?: string;
  stampedPdfStoragePath?: string;
  status: PtwStatus;
  scope: Scope;
  projectId: string | null;
  optimisticState?: 'uploading';
  responsiblePersonUid?: string;
  responsiblePersonName?: string;
  approver?: string;
  approvedDate?: string;
  rejectionReason?: string;
  signatureDataUrl?: string;
};

export type AllItems = Observation | Inspection | Ptw;

// New Notification Type
export type Notification = {
    id: string;
    userId: string; // The user who should receive the notification
    itemId: string;
    itemType: AllItems['itemType'];
    projectId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
};


// AI Flow Schemas and Types

// analyze-dashboard-data
export const AnalyzeDashboardDataInputSchema = z.object({
  totalObservations: z.number(),
  pendingPercentage: z.number(),
  criticalPercentage: z.number(),
  riskDistribution: z.array(z.object({ name: z.string(), count: z.number() })),
  companyDistribution: z.array(z.object({ name: z.string(), count: z.number() })),
  dailyTrend: z.array(z.object({ day: z.string(), pending: z.number(), completed: z.number() })),
});
export type AnalyzeDashboardDataInput = z.infer<typeof AnalyzeDashboardDataInputSchema>;

export const AnalyzeDashboardDataOutputSchema = z.object({
  keyTrends: z.string().describe('Bulleted list of the 2-3 most important overall trends (Bahasa Indonesia).'),
  emergingRisks: z.string().describe('Bulleted list of 1-2 potential new risks or areas needing attention (Bahasa Indonesia).'),
  positiveHighlights: z.string().describe('Bulleted list of 1-2 positive developments or successes (Bahasa Indonesia).'),
});
export type AnalyzeDashboardDataOutput = z.infer<typeof AnalyzeDashboardDataOutputSchema>;


// assist-observation-flow
export const AssistObservationInputSchema = z.object({
  findings: z.string().min(10).describe('The user-written findings from the observation report.'),
});
export type AssistObservationInput = z.infer<typeof AssistObservationInputSchema>;

export const AssistObservationOutputSchema = z.object({
  suggestedCategory: z.string().describe('A concise, one-or-two-word category that best describes this finding (e.g., "Unsafe Act", "Poor Housekeeping").'),
  suggestedRiskLevel: z.string().describe('The suggested risk level based on the finding.'),
  improvedFindings: z.string().describe('An improved, more professional version of the original findings text.'),
  suggestedRecommendation: z.string().describe('A suggested recommendation to address the findings.'),
});
export type AssistObservationOutput = z.infer<typeof AssistObservationOutputSchema>;

// assist-inspection-flow (NEW)
export const AssistInspectionInputSchema = z.object({
  findings: z.string().min(10).describe('The user-written findings from the inspection report.'),
});
export type AssistInspectionInput = z.infer<typeof AssistInspectionInputSchema>;

export const AssistInspectionOutputSchema = z.object({
  suggestedStatus: z.string().describe("The most likely inspection status from this list: 'Pass', 'Fail', 'Needs Repair'."),
  improvedFindings: z.string().describe('An improved, more professional version of the original findings text.'),
  suggestedRecommendation: z.string().describe('A suggested recommendation to address the findings.'),
});
export type AssistInspectionOutput = z.infer<typeof AssistInspectionOutputSchema>;


// summarize-observation-data
export const SummarizeObservationDataInputSchema = z.object({
  observationData: z.string().describe('The raw text data of the observation report.'),
});
export type SummarizeObservationDataInput = z.infer<typeof SummarizeObservationDataInputSchema>;

// This now includes all fields from the background/deeper analysis.
export const DeeperAnalysisOutputSchema = z.object({
  summary: z.string().describe('A very brief, one-sentence summary of the observation in English.'),
  risks: z.string().describe('Bulleted list of potential dangers and safety risks (English).'),
  suggestedActions: z.string().describe('Bulleted list of clear, actionable recommendations (English).'),
});
export type DeeperAnalysisOutput = z.infer<typeof DeeperAnalysisOutputSchema>;


export const AnalyzeInspectionInputSchema = z.object({
  inspectionData: z.string().describe('The raw text data of the equipment inspection report.'),
});
export type AnalyzeInspectionInput = z.infer<typeof AnalyzeInspectionInputSchema>;

export const AnalyzeInspectionOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the core inspection findings in English.'),
  risks: z.string().describe('Analysis of potential hazards and risks from the inspection findings, as bullet points (English).'),
  suggestedActions: z.string().describe('Suggested actions for repair or further checks, as bullet points (English).'),
});
export type AnalyzeInspectionOutput = z.infer<typeof AnalyzeInspectionOutputSchema>;


// smart-notify-flow
export const SmartNotifyInputSchema = z.object({
    observationId: z.string(),
    projectId: z.string(),
    company: z.string(),
    findings: z.string(),
    riskLevel: z.nativeEnum(Object.fromEntries(RISK_LEVELS.map(level => [level, level])) as { [K in RiskLevel]: K }),
    submitterId: z.string().describe("The UID of the user who submitted the observation, to be excluded from notifications."),
    submittedByDisplayName: z.string().describe("The display name of the user who submitted the observation, for use in message generation."),
});
export type SmartNotifyInput = z.infer<typeof SmartNotifyInputSchema>;

export const SmartNotifyOutputSchema = z.object({
  notifications: z.array(z.object({
    uid: z.string().describe("The UID of the user to notify."),
    message: z.string().describe("The personalized notification message for this user, in Bahasa Indonesia.")
  })).describe('A list of personalized notifications to be sent.'),
});
export type SmartNotifyOutput = z.infer<typeof SmartNotifyOutputSchema>;
