'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MoreVertical, UserPlus, Trash2, LogOut, Loader2, Users, FileCog } from 'lucide-react';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { LeaveProjectDialog } from '@/components/leave-project-dialog';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import { ManageProjectDialog } from '@/components/manage-project-dialog';
import type { Project } from '@/lib/types';
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

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const { toast } = useToast();
  
  const projectId = params.projectId as string;
  const project = React.useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  // State for dialogs
  const [isAddMemberOpen, setAddMemberOpen] = React.useState(false);
  const [isDeleteOpen, setDeleteOpen] = React.useState(false);
  const [isLeaveOpen, setLeaveOpen] = React.useState(false);
  const [isManageOpen, setManageOpen] = React.useState(false);
  const [manageDefaultTab, setManageDefaultTab] = React.useState<'members' | 'settings'>('members');

  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  const isOwner = user && project && project.ownerUid === user.uid;
  const isLoading = projectsLoading;
  
  const handleSuccess = () => {
    setDeleteOpen(false);
    setLeaveOpen(false);
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
  
  const openManageDialog = (tab: 'members' | 'settings') => {
    setManageDefaultTab(tab);
    setManageOpen(true);
  }

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
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start gap-4">
          <div>
             <Button variant="ghost" size="sm" className="mb-2 -ml-3" onClick={() => router.push('/beranda')}>
              <ArrowLeft className="mr-2" />
              Back to Hub
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">Project activity feed and management options.</p>
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
                <DropdownMenuItem onSelect={() => openManageDialog('members')}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>View Members ({project.memberUids?.length || 0})</span>
                </DropdownMenuItem>

                {isOwner && (
                  <>
                    <DropdownMenuItem onSelect={() => openManageDialog('settings')}>
                      <FileCog className="mr-2 h-4 w-4" />
                      <span>Project Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Owner Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setAddMemberOpen(true)} disabled={!(project.isOpen ?? true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Add Member</span>
                    </DropdownMenuItem>
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
                )}
                
                {!isOwner && (
                  <>
                    <DropdownMenuSeparator />
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
        
        {/* Main Content: Activity Feed */}
        <div className="mt-6">
            <FeedView mode="project" projectId={projectId} />
        </div>
      </div>

      {/* Dialogs */}
      {project && (
          <ManageProjectDialog
              isOpen={isManageOpen}
              onOpenChange={setManageOpen}
              project={project}
              defaultTab={manageDefaultTab}
          />
      )}

      {isOwner && project && (
        <>
          <AddMemberDialog isOpen={isAddMemberOpen} onOpenChange={setAddMemberOpen} project={project} />
          <DeleteProjectDialog isOpen={isDeleteOpen} onOpenChange={setDeleteOpen} project={project} onSuccess={handleSuccess} />
        </>
      )}
      
      {!isOwner && project && (
        <LeaveProjectDialog isOpen={isLeaveOpen} onOpenChange={setLeaveOpen} project={project} onSuccess={handleSuccess} />
      )}
    </>
  );
}
