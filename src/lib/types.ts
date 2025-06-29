

export type ObservationStatus = 'Pending' | 'In Progress' | 'Completed';
export type ObservationCategory = 'Structural' | 'Electrical' | 'Plumbing' | 'General';
export type Company = 'Tambang' | 'Migas' | 'Konstruksi' | 'Manufaktur';
export type Location = 'International' | 'National' | 'Local' | 'Regional';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export const RISK_LEVELS: [RiskLevel, ...RiskLevel[]] = ['Low', 'Medium', 'High', 'Critical'];

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  position: string;
};

export type Observation = {
  id: string;
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
  scope?: 'public' | 'private';
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
  aiStatus?: 'processing' | 'completed' | 'failed';
  aiSummary?: string;
  aiRisks?: string;
  aiSuggestedActions?: string;
};

export type PtwStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed';

export type Ptw = {
  id: string;
  referenceId?: string;
  userId: string;
  submittedBy: string;
  date: string;
  location: Location;
  workDescription: string;
  contractor: string;
  jsaPdfUrl: string;
  status: PtwStatus;
  scope?: 'public' | 'private';
  approver?: string;
  approvedDate?: string;
  rejectionReason?: string;
  signatureDataUrl?: string;
};
