
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
export const AnalyzeDashboardDataInputSchema = z.string().describe("A summary of dashboard metrics in text format.");
export type AnalyzeDashboardDataInput = z.infer<typeof AnalyzeDashboardDataInputSchema>;

export const AnalyzeDashboardDataOutputSchema = z.object({
  analysis: z.string().describe('A bulleted list of 3-4 key insights, trends, or risks based on the data, in Bahasa Indonesia. Each point should start with a hyphen (-).'),
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

// Lifting Plan Types
export interface CraneLoadChartCapacity {
    radius: number;
    capacity: number;
}
export interface CraneLoadChartEntry {
    boom: number;
    capacities: CraneLoadChartCapacity[];
}
export interface CraneSpecifications {
    'Kapasitas Angkat Maks.': string;
    'Panjang Keseluruhan': string;
    'Lebar Keseluruhan': string;
    'Tinggi Keseluruhan': string;
    'Bentangan Outrigger (P x L)': string;
    'Panjang Boom Dasar': string;
    'Panjang Boom Penuh': string;
    'Berat Counterweight': string;
}
export interface CraneData {
    specifications: CraneSpecifications;
    loadChart: CraneLoadChartEntry[];
}
export const CRANE_DATA: Record<string, CraneData> = {
    'SANYSTC250': {
        specifications: {
            'Kapasitas Angkat Maks.': '25 Ton',
            'Panjang Keseluruhan': '12.8 m',
            'Lebar Keseluruhan': '2.5 m',
            'Tinggi Keseluruhan': '4.0 m',
            'Bentangan Outrigger (P x L)': '5.3 m x 6.2 m',
            'Panjang Boom Dasar': '10.65 m',
            'Panjang Boom Penuh': '33.5 m',
            'Berat Counterweight': '3.8 Ton'
        },
        loadChart: [
            { boom: 10.65, capacities: [
                { radius: 3, capacity: 25.0 }, { radius: 3.5, capacity: 25.0 }, { radius: 4, capacity: 24.3 },
                { radius: 4.5, capacity: 21.82 }, { radius: 5, capacity: 18.9 }, { radius: 5.5, capacity: 17.35 },
                { radius: 6, capacity: 15.8 }, { radius: 7, capacity: 12.2 }, { radius: 8, capacity: 9.7 }
            ]},
            { boom: 14.5, capacities: [
                { radius: 3, capacity: 18.0 }, { radius: 3.5, capacity: 18.0 }, { radius: 4, capacity: 18.0 },
                { radius: 4.5, capacity: 17.0 }, { radius: 5, capacity: 16.5 }, { radius: 5.5, capacity: 16.0 },
                { radius: 6, capacity: 14.5 }, { radius: 7, capacity: 12.2 }, { radius: 8, capacity: 10.0 },
                { radius: 9, capacity: 8.5 }, { radius: 10, capacity: 7.5 }, { radius: 11, capacity: 6.25 },
                { radius: 12, capacity: 5.5 }, { radius: 13, capacity: 4.6 }, { radius: 14, capacity: 4.0 },
                { radius: 15, capacity: 3.5 }
            ]},
            { boom: 18.3, capacities: [
                { radius: 3.5, capacity: 15.0 }, { radius: 4, capacity: 14.9 }, { radius: 4.5, capacity: 14.9 },
                { radius: 5, capacity: 14.5 }, { radius: 5.5, capacity: 13.8 }, { radius: 6, capacity: 13.3 },
                { radius: 7, capacity: 11.3 }, { radius: 8, capacity: 9.8 }, { radius: 9, capacity: 8.25 },
                { radius: 10, capacity: 6.9 }, { radius: 11, capacity: 5.85 }, { radius: 12, capacity: 5.16 },
                { radius: 13, capacity: 4.55 }, { radius: 14, capacity: 4.0 }, { radius: 15, capacity: 3.5 },
                { radius: 16, capacity: 3.2 }, { radius: 17, capacity: 2.8 }, { radius: 18, capacity: 2.6 }
            ]},
            { boom: 22.1, capacities: [
                { radius: 4, capacity: 11.0 }, { radius: 4.5, capacity: 11.0 }, { radius: 5, capacity: 11.0 },
                { radius: 5.5, capacity: 11.0 }, { radius: 6, capacity: 11.0 }, { radius: 7, capacity: 9.5 },
                { radius: 8, capacity: 8.5 }, { radius: 9, capacity: 7.55 }, { radius: 10, capacity: 6.7 },
                { radius: 11, capacity: 5.8 }, { radius: 12, capacity: 5.1 }, { radius: 13, capacity: 4.51 },
                { radius: 14, capacity: 4.0 }, { radius: 15, capacity: 3.55 }, { radius: 16, capacity: 3.15 },
                { radius: 17, capacity: 2.8 }, { radius: 18, capacity: 2.58 }, { radius: 19, capacity: 2.21 },
                { radius: 20, capacity: 2.05 }, { radius: 21, capacity: 1.8 }, { radius: 22, capacity: 1.65 }
            ]},
            { boom: 25.9, capacities: [
                { radius: 5, capacity: 9.15 }, { radius: 5.5, capacity: 9.15 }, { radius: 6, capacity: 8.9 },
                { radius: 7, capacity: 8.3 }, { radius: 8, capacity: 7.6 }, { radius: 9, capacity: 7.2 },
                { radius: 10, capacity: 6.5 }, { radius: 11, capacity: 5.7 }, { radius: 12, capacity: 5.1 },
                { radius: 13, capacity: 4.4 }, { radius: 14, capacity: 3.9 }, { radius: 15, capacity: 3.55 },
                { radius: 16, capacity: 3.15 }, { radius: 17, capacity: 2.85 }, { radius: 18, capacity: 2.58 },
                { radius: 19, capacity: 2.2 }, { radius: 20, capacity: 2.0 }, { radius: 21, capacity: 1.8 },
                { radius: 22, capacity: 1.6 }, { radius: 23, capacity: 1.4 }, { radius: 24, capacity: 1.3 },
                { radius: 25, capacity: 1.1 }
            ]},
            { boom: 29.7, capacities: [
                { radius: 5, capacity: 7.5 }, { radius: 5.5, capacity: 7.5 }, { radius: 6, capacity: 7.5 },
                { radius: 7, capacity: 7.4 }, { radius: 8, capacity: 6.5 }, { radius: 9, capacity: 6.2 },
                { radius: 10, capacity: 5.7 }, { radius: 11, capacity: 5.2 }, { radius: 12, capacity: 4.8 },
                { radius: 13, capacity: 4.2 }, { radius: 14, capacity: 3.85 }, { radius: 15, capacity: 3.7 },
                { radius: 16, capacity: 3.15 }, { radius: 17, capacity: 2.9 }, { radius: 18, capacity: 2.55 },
                { radius: 19, capacity: 2.2 }, { radius: 20, capacity: 1.97 }, { radius: 21, capacity: 1.8 },
                { radius: 22, capacity: 1.6 }, { radius: 23, capacity: 1.4 }, { radius: 24, capacity: 1.3 },
                { radius: 25, capacity: 1.1 }
            ]},
            { boom: 33.5, capacities: [
                { radius: 8, capacity: 6.15 }, { radius: 9, capacity: 5.6 }, { radius: 10, capacity: 5.1 },
                { radius: 11, capacity: 4.8 }, { radius: 12, capacity: 4.38 }, { radius: 13, capacity: 4.2 },
                { radius: 14, capacity: 3.85 }, { radius: 15, capacity: 3.7 }, { radius: 16, capacity: 3.15 },
                { radius: 17, capacity: 2.9 }, { radius: 18, capacity: 2.55 }, { radius: 19, capacity: 2.2 },
                { radius: 20, capacity: 1.97 }, { radius: 21, capacity: 1.8 }, { radius: 22, capacity: 1.6 },
                { radius: 23, capacity: 1.4 }, { radius: 24, capacity: 1.3 }, { radius: 25, capacity: 1.1 }
            ]}
        ]
    },
    'mobileCrane50T': {
        specifications: {
            'Kapasitas Angkat Maks.': '50 Ton',
            'Panjang Keseluruhan': '12.0 m',
            'Lebar Keseluruhan': '2.8 m',
            'Tinggi Keseluruhan': '3.9 m',
            'Bentangan Outrigger (P x L)': '6.0 m x 6.5 m',
            'Panjang Boom Dasar': '11.0 m',
            'Panjang Boom Penuh': '40.0 m',
            'Berat Counterweight': '5.0 Ton'
        },
        loadChart: [
            { boom: 20, capacities: [{ radius: 5, capacity: 50 }, { radius: 10, capacity: 25 }, { radius: 15, capacity: 15 }, { radius: 20, capacity: 10 }] },
            { boom: 30, capacities: [{ radius: 10, capacity: 20 }, { radius: 15, capacity: 12 }, { radius: 20, capacity: 8 }, { radius: 25, capacity: 6 }] },
            { boom: 40, capacities: [{ radius: 15, capacity: 10 }, { radius: 20, capacity: 7 }, { radius: 25, capacity: 5 }, { radius: 30, capacity: 4 }] },
            { boom: 50, capacities: [{ radius: 20, capacity: 6 }, { radius: 25, capacity: 4 }, { radius: 30, capacity: 3 }, { radius: 35, capacity: 2 }] },
        ]
    },
    'mobileCrane100T': {
        specifications: {
            'Kapasitas Angkat Maks.': '100 Ton',
            'Panjang Keseluruhan': '14.5 m',
            'Lebar Keseluruhan': '3.0 m',
            'Tinggi Keseluruhan': '4.2 m',
            'Bentangan Outrigger (P x L)': '7.0 m x 7.5 m',
            'Panjang Boom Dasar': '12.0 m',
            'Panjang Boom Penuh': '60.0 m',
            'Berat Counterweight': '10.0 Ton'
        },
        loadChart: [
            { boom: 30, capacities: [{ radius: 10, capacity: 80 }, { radius: 15, capacity: 50 }, { radius: 20, capacity: 30 }, { radius: 25, capacity: 20 }] },
            { boom: 40, capacities: [{ radius: 15, capacity: 40 }, { radius: 20, capacity: 25 }, { radius: 25, capacity: 18 }, { radius: 30, capacity: 12 }] },
            { boom: 60, capacities: [{ radius: 20, capacity: 20 }, { radius: 30, capacity: 12 }, { radius: 40, capacity: 8 }, { radius: 50, capacity: 5 }] },
            { boom: 80, capacities: [{ radius: 30, capacity: 10 }, { radius: 40, capacity: 7 }, { radius: 50, capacity: 4 }, { radius: 60, capacity: 2 }] },
        ]
    }
};

    