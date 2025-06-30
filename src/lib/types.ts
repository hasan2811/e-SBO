
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
  projectIds?: string[]; // Added to store project memberships for efficient querying.
};

export type Project = {
    id: string;
    name: string;
    ownerUid: string;
    memberUids: string[];
    createdAt: string;
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
