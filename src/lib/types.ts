export type InspectionStatus = 'Pending' | 'In Progress' | 'Completed';
export type InspectionCategory = 'Structural' | 'Electrical' | 'Plumbing' | 'General';
export type Company = 'Perusahaan A' | 'Perusahaan B' | 'Perusahaan C' | 'Perusahaan D';

export type Inspection = {
  id: string;
  location: string;
  submittedBy: string;
  date: string;
  findings: string;
  status: InspectionStatus;
  category: InspectionCategory;
  company: Company;
  photoUrl?: string;
  photoPreview?: string;
};
