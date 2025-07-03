
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, User, UserX, ArrowLeft, MoreVertical, UserPlus, Trash2, LogOut } from 'lucide-react';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { LeaveProjectDialog } from '@/components/leave-project-dialog';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import type { Project, UserProfile } from '@/lib/types';
import { FeedView } from '@/components/feed-view';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

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
  const { toast } = useToast();
  
  const projectId = params.projectId as string;
  const project = React.useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  const [isAddMemberOpen, setAddMemberOpen] = React.useState(false);
  const [isDeleteOpen, setDeleteOpen] = React.useState(false);
  const [isLeaveOpen, setLeaveOpen] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  const isOwner = user && project && project.ownerUid === user.uid;
  const isLoading = projectsLoading;
  
  const handleSuccess = () => {
    router.push('/beranda');
  };

  const handleStatusChange = async (checked: boolean) => {
    if (!project) return;
    setIsUpdatingStatus(true);
    const projectRef = doc(db, 'projects', project.id);
    try {
      await updateDoc(projectRef, { isOpen: checked });
      toast({
        title: 'Project Status Updated',
        description: `Project is now ${checked ? 'open' : 'closed'} for new members.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update project status. Please try again.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
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
        <div className="flex justify-between items-start gap-4">
          <div>
             <Button variant="ghost" size="sm" className="mb-2 -ml-3" onClick={() => router.push('/beranda')}>
              <ArrowLeft className="mr-2" />
              Back to Hub
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">Manage project members and view its activity feed.</p>
          </div>
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                  <span className="sr-only">Project Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isOwner ? (
                  <>
                    <DropdownMenuLabel>Owner Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setAddMemberOpen(true)} disabled={!(project.isOpen ?? true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Add Member</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="relative flex items-center select-none rounded-sm px-2 py-1.5 text-sm outline-none">
                      <Label htmlFor="project-status-switch" className="flex-1 pr-2 cursor-pointer">
                        Open to Join
                      </Label>
                      <Switch
                        id="project-status-switch"
                        checked={project.isOpen ?? true}
                        onCheckedChange={handleStatusChange}
                        disabled={isUpdatingStatus}
                        aria-label="Project open for joining switch"
                      />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete Project</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onSelect={() => setLeaveOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Leave Project</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Members Section */}
        <div>
            <h2 className="text-xl font-semibold mb-4">Members ({project.members?.length || 0})</h2>
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
      
      {!isOwner && project && (
        <LeaveProjectDialog isOpen={isLeaveOpen} onOpenChange={setLeaveOpen} project={project} onSuccess={handleSuccess} />
      )}

      {memberToRemove && project && (
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
