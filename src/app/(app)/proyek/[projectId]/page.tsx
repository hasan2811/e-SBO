
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FeedView } from '@/components/feed-view';
import { useProjects } from '@/hooks/use-projects';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Trash2, UserPlus, Users, X, LogOut, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCurrentProject } from '@/hooks/use-current-project';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { LeaveProjectDialog } from '@/components/leave-project-dialog';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { useAuth } from '@/hooks/use-auth';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export default function ProjectFeedPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  
  const { projects, loading: projectsLoading } = useProjects();
  const { setProjectId } = useCurrentProject();
  const { toast } = useToast();
  
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isAddMemberDialogOpen, setAddMemberDialogOpen] = React.useState(false);
  const [isLeaveProjectDialogOpen, setLeaveProjectDialogOpen] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    setProjectId(projectId);
    return () => setProjectId(null); // Cleanup on unmount
  }, [projectId, setProjectId]);

  const project = React.useMemo(() => {
    if (projectsLoading || !projectId) return null;
    return projects.find(p => p.id === projectId);
  }, [projects, projectId, projectsLoading]);
  
  const isOwner = user && project && user.uid === project.ownerUid;

  const handleCopyId = () => {
    if (!project) return;
    navigator.clipboard.writeText(project.id);
    toast({
        title: "ID Proyek Disalin!",
        description: "Anda sekarang dapat membagikan ID ini dengan anggota baru.",
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name?.trim()) {
      return 'U';
    }
    const names = name.trim().split(' ').filter(n => n.length > 0);
    
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    
    if (names.length === 1) {
        return names[0][0].toUpperCase();
    }

    return 'U';
  };


  if (projectsLoading || !project) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-9 w-9" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                  <Link href="/beranda"><ArrowLeft/></Link>
              </Button>
              <h1 className="text-2xl font-bold">{project.name}</h1>
            </div>
            <div className="flex items-center gap-2">
                {isOwner ? (
                    <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => setAddMemberDialogOpen(true)}>
                                  <UserPlus className="h-4 w-4" />
                                  <span className="sr-only">Tambah Anggota</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tambah Anggota</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Hapus Proyek</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Hapus Proyek</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    </>
                ) : (
                    <Button variant="destructive" onClick={() => setLeaveProjectDialogOpen(true)}>
                        <LogOut className="mr-2 h-4 w-4"/> Keluar Proyek
                    </Button>
                )}
            </div>
        </div>

        <div className="flex items-center gap-2 p-2 mb-2 bg-muted rounded-md border">
            <span className="font-mono text-sm text-muted-foreground">ID: {project.id}</span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Salin ID Proyek</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Salin ID Proyek</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5"/>
                Anggota Proyek
            </CardTitle>
            <CardDescription>
                {project.members?.length || 0} anggota tergabung dalam proyek ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              {project.members?.map(member => (
                <div key={member.uid} className="relative group flex flex-col items-center gap-2 text-center w-20">
                    {isOwner && user?.uid !== member.uid && (
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() => setMemberToRemove(member)}
                            aria-label={`Hapus ${member.displayName}`}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={member.photoURL ?? undefined} alt={member.displayName ?? ''} />
                        <AvatarFallback className="text-lg">{getInitials(member.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        <p className="text-xs font-medium leading-tight truncate w-full">{member.displayName}</p>
                        {member.uid === project.ownerUid && <p className="text-xs text-primary font-semibold -mt-0.5">(Owner)</p>}
                    </div>
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

      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        project={project}
      />
      
      <RemoveMemberDialog
        isOpen={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        project={project}
        member={memberToRemove}
      />
      
      <LeaveProjectDialog
        isOpen={isLeaveProjectDialogOpen}
        onOpenChange={setLeaveProjectDialogOpen}
        project={project}
        onSuccess={() => router.push('/beranda')}
      />
    </>
  );
}
