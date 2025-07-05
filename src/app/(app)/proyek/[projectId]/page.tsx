
'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { FeedView } from '@/components/feed-view';
import { PageSkeleton } from '@/components/page-skeleton';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, loading: projectsLoading } = useProjects();
  
  const projectId = params.projectId as string;
  const observationIdToOpen = searchParams.get('openObservation');
  const project = React.useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  if (projectsLoading) {
    return <PageSkeleton />;
  }

  if (!project) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Proyek Tidak Ditemukan</h2>
        <p className="text-muted-foreground">Proyek mungkin telah dihapus atau Anda tidak memiliki izin untuk melihatnya.</p>
        <Button onClick={() => router.push('/beranda')} className="mt-4">
          <ArrowLeft className="mr-2" />
          Kembali ke Project Hub
        </Button>
      </div>
    );
  }

  return (
    <FeedView 
      mode="project" 
      projectId={projectId} 
      observationIdToOpen={observationIdToOpen}
      title={project.name}
      description="Feed terpadu untuk semua aktivitas proyek."
      showBackButton={true}
    />
  );
}
