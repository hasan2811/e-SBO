
'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import { FeedView } from '@/components/feed-view';
import { PageSkeleton } from '@/components/page-skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProjectPtwPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, loading: projectsLoading } = useProjects();
  
  const projectId = params.projectId as string;
  const itemIdToOpen = searchParams.get('openItem');

  if (projectsLoading || !projectId) {
    return <PageSkeleton />;
  }
  
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Project Not Found</h2>
        <p className="text-muted-foreground">The project may have been deleted or you don't have permission.</p>
        <Button onClick={() => router.push('/beranda')} className="mt-4">
          <ArrowLeft className="mr-2" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <FeedView 
      projectId={projectId} 
      itemTypeFilter="ptw"
      itemIdToOpen={itemIdToOpen}
      title="Permit to Work"
    />
  );
}
