
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, User, UserPlus, LogOut, Trash2, UserX, ArrowLeft, Feed } from 'lucide-react';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { LeaveProjectDialog } from '@/components/leave-project-dialog';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import type { Project, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { FeedView } from '@/components/feed-view';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() ?? 'U';
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  
  const projectId = params.projectId as string;
  const project = React.useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  const [isAddMemberOpen, setAddMemberOpen] = React.useState(false);
  const [isDeleteOpen, setDeleteOpen] = React.useState(false);
  const [isLeaveOpen, setLeaveOpen] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);

  const isOwner = user && project && project.ownerUid === user.uid;
  const isLoading = projectsLoading;
  
  const handleSuccess = () => {
    router.push('/beranda');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Project Not Found</h2>
        <p className="text-muted-foreground">The project may have been deleted or you do not have permission to view it.</p>
        <Button onClick={() => router.push('/beranda')} className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Project Hub
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
             <Button variant="ghost" size="sm" className="mb-2 -ml-3" onClick={() => router.push('/beranda')}>
              <ArrowLeft className="mr-2" />
              Back to Hub
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">Manage project members and view its activity feed.</p>
          </div>
          <div className="flex w-full flex-shrink-0 sm:w-auto gap-2">
            {isOwner ? (
              <>
                <Button onClick={() => setAddMemberOpen(true)}>
                  <UserPlus className="mr-2" />
                  Add Member
                </Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="icon" onClick={() => setLeaveOpen(true)}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Leave Project</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {/* Members Section */}
        <div>
            <h2 className="text-xl font-semibold mb-4">Members</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {project.members?.sort((a,b) => (a.uid === project.ownerUid ? -1 : 1)).map(member => (
                <Card key={member.uid} className="flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-12 w-12">
                    <AvatarImage src={member.photoURL ?? undefined} data-ai-hint="person face" />
                    <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                    <CardTitle className="truncate">{member.displayName}</CardTitle>
                    <CardDescription className="truncate">{member.position}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex justify-between items-center bg-muted/50 p-3 mt-auto">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                    {member.uid === project.ownerUid ? (
                        <>
                        <Crown className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-600">Owner</span>
                        </>
                    ) : (
                        <>
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Member</span>
                        </>
                    )}
                    </div>
                    {isOwner && member.uid !== user?.uid && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setMemberToRemove(member)}
                    >
                        <UserX className="mr-2 h-4 w-4" />
                        Remove
                    </Button>
                    )}
                </CardContent>
                </Card>
            ))}
            </div>
        </div>

        {/* Feed Section */}
        <div className="space-y-4 pt-4 border-t">
          <FeedView mode="project" projectId={projectId} />
        </div>
      </div>

      {/* Dialogs */}
      {isOwner && (
        <>
          <AddMemberDialog isOpen={isAddMemberOpen} onOpenChange={setAddMemberOpen} project={project} />
          <DeleteProjectDialog isOpen={isDeleteOpen} onOpenChange={setDeleteOpen} project={project} onSuccess={handleSuccess} />
        </>
      )}
      
      {!isOwner && (
        <LeaveProjectDialog isOpen={isLeaveOpen} onOpenChange={setLeaveOpen} project={project} onSuccess={handleSuccess} />
      )}

      {memberToRemove && (
        <RemoveMemberDialog
          isOpen={!!memberToRemove}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          project={project}
          member={memberToRemove}
        />
      )}
    </>
  );
}
