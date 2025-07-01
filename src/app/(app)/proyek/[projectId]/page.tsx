
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { FeedView } from '@/components/feed-view';
import { useProjects } from '@/hooks/use-projects';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProjectFeedPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const { projects, loading: projectsLoading } = useProjects();

  const project = React.useMemo(() => {
    if (projectsLoading || !projectId) return null;
    return projects.find(p => p.id === projectId);
  }, [projects, projectId, projectsLoading]);

  if (projectsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex items-center gap-2 -mt-2 mb-2">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/beranda"><ArrowLeft/></Link>
        </Button>
        <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Proyek:</span>
            <h1 className="text-xl font-bold">{project?.name || 'Loading...'}</h1>
        </div>
      </div>
      <FeedView mode="project" projectId={projectId} />
    </div>
  );
}
