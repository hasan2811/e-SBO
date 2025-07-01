
import { z } from 'zod';

export type ObservationStatus = 'Pending' | 'In Progress' | 'Completed';
export type ObservationCategory = 'Structural' | 'Electrical' | 'Plumbing' | 'General';
export type Company = 'Tambang' | 'Migas' | 'Konstruksi' | 'Manufaktur';
export type Location = 'International' | 'National' | 'Local' | 'Regional';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type Scope = 'public' | 'private' | 'project';

export const RISK_LEVELS: [RiskLevel, ...RiskLevel[]] = ['Low', 'Medium', 'High', 'Critical'];
export const OBSERVATION_STATUSES: [ObservationStatus, ...ObservationStatus[]] = ['Pending', 'In Progress', 'Completed'];
export const OBSERVATION_CATEGORIES: [ObservationCategory, ...ObservationCategory[]] = ['Structural', 'Electrical', 'Plumbing', 'General'];


export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  position: string;
};

export type Project = {
    id: string;
    name: string;
    ownerUid: string;
    memberUids: string[];
    createdAt: string;
    // Enriched client-side
    owner?: UserProfile; 
    members?: UserProfile[];
}

export type Observation = {
  id: string;
  itemType: 'observation';
  referenceId?: string; // Professional, user-facing ID
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
  photoUrl?: string;
  scope: Scope;
  projectId?: string | null;
  actionTakenDescription?: string;
  actionTakenPhotoUrl?: string;
  closedBy?: string;
  closedDate?: string;
  aiStatus?: 'processing' | 'completed' | 'failed';
  aiSummary?: string;
  aiRisks?: string;
  aiSuggestedActions?: string;
  aiRelevantRegulations?: string;
  aiSuggestedRiskLevel?: RiskLevel;
  aiRootCauseAnalysis?: string;
  aiObserverSkillRating?: number;
  aiObserverSkillExplanation?: string;
};

// New Types for Inspection and PTW
export type InspectionStatus = 'Pass' | 'Fail' | 'Needs Repair';
export type EquipmentType = 'Heavy Machinery' | 'Hand Tool' | 'Vehicle' | 'Electrical' | 'Other';

export type Inspection = {
  id: string;
  itemType: 'inspection';
  referenceId?: string;
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
  scope: Scope;
  projectId?: string | null;
  aiStatus?: 'processing' | 'completed' | 'failed';
  aiSummary?: string;
  aiRisks?: string;
  aiSuggestedActions?: string;
};

export type PtwStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed';

export type Ptw = {
  id: string;
  itemType: 'ptw';
  referenceId?: string;
  userId: string;
  submittedBy: string;
  date: string;
  location: Location;
  workDescription: string;
  contractor: string;
  jsaPdfUrl: string;
  status: PtwStatus;
  scope: Scope;
  projectId?: string | null;
  approver?: string;
  approvedDate?: string;
  rejectionReason?: string;
  signatureDataUrl?: string;
};

export type AllItems = Observation | Inspection | Ptw;


// AI Flow Schemas and Types

// analyze-dashboard-data
export const AnalyzeDashboardDataInputSchema = z.object({
  totalObservations: z.number(),
  pendingPercentage: z.number(),
  criticalPercentage: z.number(),
  riskDistribution: z.array(z.object({ name: z.string(), count: z.number() })),
  companyDistribution: z.array(z.object({ name: z.string(), value: z.number() })),
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
  findings: z.string().min(20).describe('The user-written findings from the observation report.'),
});
export type AssistObservationInput = z.infer<typeof AssistObservationInputSchema>;

export const AssistObservationOutputSchema = z.object({
  suggestedCategory: z.string().describe('The most likely category for this finding.'),
  suggestedRiskLevel: z.string().describe('The suggested risk level based on the finding.'),
  improvedFindings: z.string().describe('An improved, more professional version of the original findings text.'),
  suggestedRecommendation: z.string().describe('A suggested recommendation to address the findings.'),
});
export type AssistObservationOutput = z.infer<typeof AssistObservationOutputSchema>;


// summarize-observation-data
export const SummarizeObservationDataInputSchema = z.object({
  observationData: z.string().describe('The raw text data of the observation report.'),
});
export type SummarizeObservationDataInput = z.infer<typeof SummarizeObservationDataInputSchema>;

export const SummarizeObservationDataOutputSchema = z.object({
  summary: z.string().describe('Ringkasan singkat dari temuan inti dalam Bahasa Indonesia.'),
  risks: z.string().describe('Analisis potensi bahaya dan risiko dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  suggestedActions: z.string().describe('Saran tindakan perbaikan dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  relevantRegulations: z.string().describe('Poin-poin inti dari peraturan nasional & internasional yang relevan beserta penjelasan singkatnya (Bahasa Indonesia).'),
  suggestedRiskLevel: z.enum(RISK_LEVELS).describe('Saran tingkat risiko (Low, Medium, High, Critical) berdasarkan analisis temuan.'),
  rootCauseAnalysis: z.string().describe('Analisis singkat mengenai kemungkinan akar penyebab masalah (Bahasa Indonesia).'),
  observerAssessment: z.object({
      rating: z.number().min(1).max(5).describe('Rating 1-5 tingkat pemahaman observer. 1: Sangat Dasar, 2: Dasar, 3: Cukup Paham, 4: Paham, 5: Sangat Paham/Ahli.'),
      explanation: z.string().describe('Analisis personal tentang laporan observer, sebutkan namanya.'),
  })
});
export type SummarizeObservationDataOutput = z.infer<typeof SummarizeObservationDataOutputSchema>;

export const AnalyzeInspectionInputSchema = z.object({
  inspectionData: z.string().describe('The raw text data of the equipment inspection report.'),
});
export type AnalyzeInspectionInput = z.infer<typeof AnalyzeInspectionInputSchema>;

export const AnalyzeInspectionOutputSchema = z.object({
  summary: z.string().describe('Ringkasan singkat dari temuan inti inspeksi dalam Bahasa Indonesia.'),
  risks: z.string().describe('Analisis potensi bahaya dan risiko dari temuan inspeksi, dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  suggestedActions: z.string().describe('Saran tindakan perbaikan atau pengecekan lebih lanjut, dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
});
export type AnalyzeInspectionOutput = z.infer<typeof AnalyzeInspectionOutputSchema>;
