
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FeedView } from '@/components/feed-view';
import { useProjects } from '@/hooks/use-projects';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCurrentProject } from '@/hooks/use-current-project';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function ProjectFeedPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  
  const { projects, loading: projectsLoading } = useProjects();
  const { setProjectId } = useCurrentProject();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setProjectId(projectId);
    return () => setProjectId(null); // Cleanup on unmount
  }, [projectId, setProjectId]);

  const project = React.useMemo(() => {
    if (projectsLoading || !projectId) return null;
    return projects.find(p => p.id === projectId);
  }, [projects, projectId, projectsLoading]);
  
  const isOwner = user && project && user.uid === project.ownerUid;

  if (projectsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-9 w-9" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 -mt-2 mb-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                  <Link href="/beranda"><ArrowLeft/></Link>
              </Button>
              <h1 className="text-xl font-bold">{project?.name || 'Loading Project...'}</h1>
            </div>
            {isOwner && (
              <Button variant="outline" size="icon" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Delete Project</span>
              </Button>
            )}
        </div>
        <FeedView mode="project" projectId={projectId} />
      </div>

      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        project={project}
        onSuccess={() => router.push('/beranda')}
      />
    </>
  );
}
