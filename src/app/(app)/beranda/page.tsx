
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
import { Folder, FolderPlus, LogIn, Users, Crown, MoreVertical, FileCog, LogOut, Trash2, AlertTriangle, PackageOpen } from 'lucide-react';
import type { Project } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { usePerformance } from '@/contexts/performance-context';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// Dynamically import dialogs to avoid loading their code until needed
const ManageProjectDialog = dynamic(() => import('@/components/manage-project-dialog').then(mod => mod.ManageProjectDialog));
const LeaveProjectDialog = dynamic(() => import('@/components/leave-project-dialog').then(mod => mod.LeaveProjectDialog));
const DeleteProjectDialog = dynamic(() => import('@/components/delete-project-dialog').then(mod => mod.DeleteProjectDialog));

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
      <Card className="transition-all hover:shadow-lg hover:border-primary/50 flex flex-col group w-full flex-1 bg-card hover:-translate-y-1">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 overflow-hidden">
              <div className="p-3 rounded-full bg-primary/10 inline-block mb-4">
                 <Folder className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="truncate text-xl font-bold">{project.name}</CardTitle>
              <CardDescription>Click to open project.</CardDescription>
            </div>
            
            <div onClick={handleActionClick} className="flex-shrink-0 -mr-2 -mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9"
                  >
                    <MoreVertical className="h-5 w-5" />
                    <span className="sr-only">Project Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner ? (
                    <>
                      <DropdownMenuItem onSelect={onManageClick}>
                        <FileCog />
                        <span>Manage Project</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={onDeleteClick} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 />
                        <span>Delete Project</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onSelect={onLeaveClick}>
                      <LogOut />
                      <span>Leave Project</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
            {/* Can add some project stats here later if needed */}
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-6 mt-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{project.memberUids.length} Members</span>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>Owner</span>
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
        <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <Skeleton className="h-12 w-12 rounded-full mb-4" />
                    <Skeleton className="h-7 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-9 w-9 rounded-full -mr-2 -mt-2" />
            </div>
        </CardHeader>
        <CardContent className="flex-1"></CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-6 mt-auto">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
        </CardFooter>
    </Card>
);


export default function ProjectHubPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { projects, loading: projectsLoading, error: projectsError, removeProject } = useProjects();
  const { isFastConnection } = usePerformance();
  const router = useRouter();

  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
  
  const [projectToManage, setProjectToManage] = React.useState<Project | null>(null);
  const [projectToLeave, setProjectToLeave] = React.useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);

  const isLoading = projectsLoading || authLoading;

  const handleLeaveOrDeleteSuccess = (removedProjectId: string) => {
    // This function handles the smart navigation logic.
    setProjectToLeave(null);
    setProjectToDelete(null);
    removeProject(removedProjectId); // Ensure local state is updated if not already
    
    // Smart navigation
    const remainingProjects = projects.filter(p => p.id !== removedProjectId);
    if (remainingProjects.length > 0) {
      // Navigate to the first remaining project
      router.push(`/proyek/${remainingProjects[0].id}/observasi`);
    } 
    // If no projects are left, we stay on the hub page, which will show the empty state.
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
      <div className="max-w-3xl mx-auto w-full">
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
          <div className="grid grid-cols-1 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="flex h-full items-center justify-center pt-16">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Projects</AlertTitle>
          <AlertDescription>
            <p>An error occurred while trying to fetch your project list.</p>
            <code className="mt-4 relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
              {projectsError}
            </code>
            <p className="mt-4">
              Please try reloading the page. If the problem persists, there may be an issue with the database configuration that requires an administrator's attention.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto w-full">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">Project Hub</h1>
              <p className="text-muted-foreground mt-1">
                  {projects.length > 0 
                  ? `You have ${projects.length} project(s). Select one to continue.` 
                  : `Welcome, ${userProfile?.displayName}. Get started by creating or joining a project.`
                  }
              </p>
            </div>
             {projects.length > 0 && (
                  <div className="flex-shrink-0 flex gap-2 sm:gap-4">
                      <Button onClick={() => setCreateDialogOpen(true)}>
                          <FolderPlus />
                          Create Project
                      </Button>
                      <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
                          <LogIn />
                          Join Project
                      </Button>
                  </div>
              )}
          </div>

          {projects.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 gap-6"
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
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                  <Card className="w-full max-w-md shadow-sm">
                      <CardHeader className="p-8">
                          <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                              <PackageOpen className="h-12 w-12 text-primary" />
                          </div>
                          <CardTitle className="text-2xl font-bold">Start Your First Project</CardTitle>
                          <CardDescription className="mt-2 max-w-sm mx-auto">
                          You are not a member of any projects yet. Create a new one or join your team.
                          </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex flex-col sm:flex-row gap-4 p-6 bg-muted/50 border-t">
                          <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
                          <FolderPlus />
                          Create New Project
                          </Button>
                          <Button variant="outline" onClick={() => setJoinDialogOpen(true)} className="w-full">
                          <LogIn />
                          Join Project
                          </Button>
                      </CardFooter>
                  </Card>
              </div>
          )}
        </div>
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
          onSuccess={handleLeaveOrDeleteSuccess}
        />
      )}
      {projectToDelete && (
         <DeleteProjectDialog 
          isOpen={!!projectToDelete}
          onOpenChange={(open) => !open && setProjectToDelete(null)}
          project={projectToDelete}
          onSuccess={handleLeaveOrDeleteSuccess}
        />
      )}
    </>
  );
}
