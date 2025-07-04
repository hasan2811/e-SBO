
'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { FeedView } from '@/components/feed-view';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, loading: projectsLoading } = useProjects();
  
  const projectId = params.projectId as string;
  const observationIdToOpen = searchParams.get('openObservation');
  const project = React.useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  const isLoading = projectsLoading;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-8 w-1/3" />
        <div className="mt-8">
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
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
      description="Feed aktivitas proyek dan opsi manajemen."
      showBackButton={true}
    />
  );
}
