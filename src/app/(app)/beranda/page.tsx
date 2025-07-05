
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, FolderPlus, LogIn, Users, Crown } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const ProjectCard = ({ project }: { project: Project }) => {
  const router = useRouter();
  const { user } = useAuth();
  const isOwner = project.ownerUid === user?.uid;

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 flex flex-col"
      onClick={() => router.push(`/proyek/${project.id}/observasi`)}
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <Folder className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
          <div>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>Click to open this project.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-6 mt-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{project.memberUids.length} Member(s)</span>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
            <Crown className="h-4 w-4 text-amber-500" />
            <span>Owner</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

// High-fidelity skeleton for a project card
const ProjectCardSkeleton = () => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-start gap-4">
        <Skeleton className="h-8 w-8 rounded-md mt-1 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
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
  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);

  const isLoading = projectsLoading || authLoading;

  const ownedProjects = React.useMemo(() => 
    projects.filter(p => p.ownerUid === userProfile?.uid),
  [projects, userProfile]);

  const memberProjects = React.useMemo(() =>
    projects.filter(p => p.ownerUid !== userProfile?.uid),
  [projects, userProfile]);


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex-shrink-0 flex gap-2 sm:gap-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
            <h1 className="text-2xl font-bold tracking-tight">Project Hub</h1>
            <p className="text-muted-foreground">
              Selamat datang, {userProfile?.displayName}. Kelola proyek Anda atau mulai yang baru.
            </p>
          </div>
          <div className="flex-shrink-0 flex gap-2 sm:gap-4">
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

        {projects.length > 0 ? (
          <div className="space-y-8">
            {ownedProjects.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                   <Crown className="h-6 w-6 text-amber-500" />
                   <h2 className="text-xl font-semibold tracking-tight">Proyek Saya</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ownedProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            )}

            {ownedProjects.length > 0 && memberProjects.length > 0 && <Separator />}

            {memberProjects.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                   <Users className="h-6 w-6 text-primary" />
                   <h2 className="text-xl font-semibold tracking-tight">Proyek Tim</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {memberProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            )}
          </div>
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
    </>
  );
}
