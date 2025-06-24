export type ObservationStatus = 'Pending' | 'In Progress' | 'Completed';
export type ObservationCategory = 'Structural' | 'Electrical' | 'Plumbing' | 'General';
export type Company = 'Perusahaan A' | 'Perusahaan B' | 'Perusahaan C' | 'Perusahaan D';
export type Location = 'Location A' | 'Location B' | 'Location C' | 'Location D';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type Observation = {
  id: string;
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
  photoPreview?: string;
  actionTakenDescription?: string;
  actionTakenPhotoUrl?: string;
};
