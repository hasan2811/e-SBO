
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import { FeedView } from '@/components/feed-view';
import { PageSkeleton } from '@/components/page-skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProjectPtwPage() {
  const params = useParams();
  const router = useRouter();
  const { projects, loading: projectsLoading } = useProjects();
  
  const projectId = params.projectId as string;

  if (projectsLoading || !projectId) {
    return <PageSkeleton />;
  }
  
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Proyek Tidak Ditemukan</h2>
        <p className="text-muted-foreground">Proyek mungkin telah dihapus atau Anda tidak memiliki izin.</p>
        <Button onClick={() => router.push('/beranda')} className="mt-4">
          <ArrowLeft className="mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <FeedView 
      projectId={projectId} 
      itemTypeFilter="ptw"
      title="Izin Kerja"
    />
  );
}
