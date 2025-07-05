
import { redirect } from 'next/navigation';

// This page now acts as a redirector to the default view for a project,
// which is the "Observasi" tab.
export default function ProjectDetailsPage({ params }: { params: { projectId: string } }) {
  redirect(`/proyek/${params.projectId}/observasi`);
}
