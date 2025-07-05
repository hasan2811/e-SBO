'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, Folder, AlertCircle, FolderPlus, Users, MoreVertical, UserPlus, Trash2, LogOut, FileCog } from 'lucide-react';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { LeaveProjectDialog } from '@/components/leave-project-dialog';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import { ManageProjectDialog } from '@/components/manage-project-dialog';
import type { Project } from '@/lib/types';


export default function ProjectHubPage() {
  const { user } = useAuth();
  const { projects, loading, removeProject } = useProjects();
  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
  
  const [projectForAction, setProjectForAction] = React.useState<Project | null>(null);
  const [isAddMemberOpen, setAddMemberOpen] = React.useState(false);
  const [isDeleteOpen, setDeleteOpen] = React.useState(false);
  const [isLeaveOpen, setLeaveOpen] = React.useState(false);
  const [isManageOpen, setManageOpen] = React.useState(false);
  const [manageDefaultTab, setManageDefaultTab] = React.useState<'members' | 'settings'>('members');

  const openDialog = (dialogSetter: React.Dispatch<React.SetStateAction<boolean>>, project: Project, tab?: 'members' | 'settings') => {
    setProjectForAction(project);
    if (tab) setManageDefaultTab(tab);
    dialogSetter(true);
  };
  
  const handleDialogClose = () => {
    setProjectForAction(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Hub</h1>
            <p className="text-muted-foreground">
              Kelola, buat, atau gabung dengan proyek yang sudah ada di sini.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus className="mr-2" />
              Buat Proyek
            </Button>
            <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
              <LogIn className="mr-2" />
              Gabung Proyek
            </Button>
          </div>
        </div>

        {loading && projects.length === 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
        )}

        {projects.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Proyek Anda</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((project) => {
                const isOwner = user && project.ownerUid === user.uid;
                const isMember = user && project.memberUids.includes(user.uid);

                return (
                  <Link key={project.id} href={`/proyek/${project.id}`} className="block h-full">
                    <Card className="h-full flex flex-col hover:border-primary transition-colors duration-200 relative">
                        {isMember && (
                             <div className="absolute top-2 right-2 z-10">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <MoreVertical className="h-5 w-5" />
                                        <span className="sr-only">Opsi Proyek</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuItem onSelect={() => openDialog(setManageOpen, project, 'members')}>
                                            <Users className="mr-2 h-4 w-4" />
                                            <span>Lihat Anggota</span>
                                        </DropdownMenuItem>
                                        {isOwner && (
                                          <>
                                            <DropdownMenuItem onSelect={() => openDialog(setManageOpen, project, 'settings')}>
                                                <FileCog className="mr-2 h-4 w-4" />
                                                <span>Pengaturan Proyek</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Tindakan Pemilik</DropdownMenuLabel>
                                            <DropdownMenuItem onSelect={() => openDialog(setAddMemberOpen, project)} disabled={!(project.isOpen ?? true)}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                <span>Tambah Anggota</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => openDialog(setDeleteOpen, project)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Hapus Proyek</span>
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        {!isOwner && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => openDialog(setLeaveOpen, project)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                  <LogOut className="mr-2 h-4 w-4" />
                                                  <span>Tinggalkan Proyek</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                        )}
                        <CardHeader className="flex-1">
                            <CardTitle className="flex items-start gap-3 pr-8">
                                <Folder className="text-primary mt-1 flex-shrink-0"/> 
                                <span className="flex-1">{project.name}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow pt-0">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {project.memberUids?.length || 0} anggota
                            </div>
                        </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : !loading ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[200px] border-dashed">
              <CardTitle>Anda Belum Bergabung dengan Proyek Apapun</CardTitle>
              <CardDescription className="mt-2 max-w-sm">
                Buat proyek baru atau gabung dengan proyek yang sudah ada untuk memulai.
              </CardDescription>
            </Card>
        ) : null}
      </div>

      <JoinProjectDialog isOpen={isJoinDialogOpen} onOpenChange={setJoinDialogOpen} />
      <CreateProjectDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
      
      {projectForAction && (
          <>
            <ManageProjectDialog
                isOpen={isManageOpen}
                onOpenChange={(open) => { if(!open) handleDialogClose(); setManageOpen(open); }}
                project={projectForAction}
                defaultTab={manageDefaultTab}
            />
            <AddMemberDialog 
                isOpen={isAddMemberOpen} 
                onOpenChange={(open) => { if(!open) handleDialogClose(); setAddMemberOpen(open); }}
                project={projectForAction} 
            />
            <DeleteProjectDialog 
                isOpen={isDeleteOpen} 
                onOpenChange={(open) => { if(!open) handleDialogClose(); setDeleteOpen(open); }}
                project={projectForAction} 
            />
            <LeaveProjectDialog 
                isOpen={isLeaveOpen} 
                onOpenChange={(open) => { if(!open) handleDialogClose(); setLeaveOpen(open); }}
                project={projectForAction} 
            />
          </>
      )}
    </>
  );
}
