
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FeedView } from '@/components/feed-view';
import { useProjects } from '@/hooks/use-projects';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Trash2, Users, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCurrentProject } from '@/hooks/use-current-project';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };


  if (projectsLoading || !project) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-9 w-9" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5"/>
                Project Members ({project.members?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {project.members?.map(member => (
                <div key={member.uid} className="flex flex-col items-center gap-2 text-center w-20">
                    <Avatar>
                        <AvatarImage src={member.uid} alt={member.displayName} />
                        <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-tight truncate w-full">{member.displayName}</span>
                    {member.uid === project.ownerUid && <span className="text-xs text-muted-foreground -mt-1.5">(Owner)</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


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
