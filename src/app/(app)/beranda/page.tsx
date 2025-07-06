
'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, FolderPlus, LogIn, Users, Crown, MoreVertical, FileCog, LogOut, Trash2 } from 'lucide-react';
import type { Project } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ManageProjectDialog } from '@/components/manage-project-dialog';
import { LeaveProjectDialog } from '@/components/leave-project-dialog';
import { DeleteProjectDialog } from '@/components/delete-project-dialog';
import { usePerformance } from '@/contexts/performance-context';

const ProjectCard = ({ 
  project, 
  onManageClick,
  onLeaveClick,
  onDeleteClick
}: { 
  project: Project,
  onManageClick: () => void,
  onLeaveClick: () => void,
  onDeleteClick: () => void,
}) => {
  const { user } = useAuth();
  const isOwner = project.ownerUid === user?.uid;

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link href={`/proyek/${project.id}/observasi`} className="h-full flex flex-col" prefetch={true}>
      <Card className="transition-all hover:shadow-md hover:border-primary/50 flex flex-col group w-full flex-1">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-4 flex-1 overflow-hidden">
              <Folder className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <CardTitle className="truncate text-xl">{project.name}</CardTitle>
                <CardDescription>Klik untuk membuka proyek.</CardDescription>
              </div>
            </div>
            
            <div onClick={handleActionClick} className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                  >
                    <MoreVertical />
                    <span className="sr-only">Tindakan Proyek</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner && (
                    <>
                      <DropdownMenuItem onSelect={onManageClick}>
                        <FileCog />
                        <span>Kelola Proyek</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={onLeaveClick}>
                    <LogOut />
                    <span>Keluar dari Proyek</span>
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={onDeleteClick} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 />
                        <span>Hapus Proyek</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-6 mt-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{project.memberUids.length} Anggota</span>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>Pemilik</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
};


const ProjectCardSkeleton = () => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-4 flex-1">
          <Skeleton className="h-8 w-8 rounded-md mt-1 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </CardHeader>
    <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-6 mt-auto">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-16" />
    </CardFooter>
  </Card>
);


export default function ProjectHubPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const { isFastConnection } = usePerformance();

  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
  
  const [projectToManage, setProjectToManage] = React.useState<Project | null>(null);
  const [projectToLeave, setProjectToLeave] = React.useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);

  const isLoading = projectsLoading || authLoading;

  const handleLeaveSuccess = (projectId: string) => {
    // The onSnapshot listener in ProjectProvider will automatically remove the project from the UI.
    // This handler's only job is to close the dialog, which prevents a UI freeze/race condition.
    setProjectToLeave(null);
  };

  const handleDeleteSuccess = (projectId: string) => {
    // The onSnapshot listener will handle the UI update reactively.
    // This handler just needs to close the dialog to prevent UI freeze issues.
    setProjectToDelete(null);
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: isFastConnection ? 0.05 : 0,
      },
    },
  };

  const itemVariants = {
    hidden: { y: isFastConnection ? 20 : 0, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex-shrink-0 flex gap-2 sm:gap-4">
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Project Hub</h1>
            <p className="text-muted-foreground">
              Selamat datang, {userProfile?.displayName}. Kelola proyek Anda atau mulai yang baru.
            </p>
          </div>
          <div className="flex-shrink-0 flex gap-2 sm:gap-4">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus />
              Buat Proyek
            </Button>
            <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
              <LogIn />
              Gabung Proyek
            </Button>
          </div>
        </div>

        {projects.length > 0 ? (
          <motion.div 
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {projects.map((project) => (
                <motion.div key={project.id} variants={itemVariants}>
                    <ProjectCard 
                      project={project}
                      onManageClick={() => setProjectToManage(project)}
                      onLeaveClick={() => setProjectToLeave(project)}
                      onDeleteClick={() => setProjectToDelete(project)}
                    />
                </motion.div>
              ))}
          </motion.div>
        ) : (
          <div className="flex h-full items-center justify-center pt-16">
            <Card className="w-full max-w-lg text-center p-8 border-dashed">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <FolderPlus className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-2xl">Anda belum memiliki proyek</CardTitle>
                    <CardDescription className="mt-2 max-w-sm mx-auto">
                        Buat proyek baru atau gabung dengan proyek yang sudah ada untuk memulai.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Gunakan tombol di atas untuk memulai.</p>
                </CardContent>
            </Card>
          </div>
        )}
      </div>

      <JoinProjectDialog isOpen={isJoinDialogOpen} onOpenChange={setJoinDialogOpen} />
      <CreateProjectDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />

      {projectToManage && (
        <ManageProjectDialog 
          isOpen={!!projectToManage} 
          onOpenChange={() => setProjectToManage(null)} 
          project={projectToManage} 
        />
      )}
      {projectToLeave && (
        <LeaveProjectDialog 
          isOpen={!!projectToLeave}
          onOpenChange={(open) => !open && setProjectToLeave(null)}
          project={projectToLeave}
          onSuccess={handleLeaveSuccess}
        />
      )}
      {projectToDelete && (
         <DeleteProjectDialog 
          isOpen={!!projectToDelete}
          onOpenChange={(open) => !open && setProjectToDelete(null)}
          project={projectToDelete}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
