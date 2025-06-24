export type InspectionStatus = 'Pending' | 'In Progress' | 'Completed';
export type InspectionCategory = 'Structural' | 'Electrical' | 'Plumbing' | 'General';

export type Inspection = {
  id: string;
  location: string;
  submittedBy: string;
  date: string;
  findings: string;
  status: InspectionStatus;
  category: InspectionCategory;
  photoUrl?: string;
  photoPreview?: string;
};
