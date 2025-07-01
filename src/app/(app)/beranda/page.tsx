
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FolderKanban, PlusCircle, Users, User, ArrowRight, FolderPlus } from 'lucide-react';
import { ProjectDialog } from '@/components/project-dialog';
import { useAuth } from '@/hooks/use-auth';

function ProjectCard({ project }: { project: import('@/lib/types').Project }) {
  return (
    <Card className="flex flex-col h-full hover:border-primary transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FolderKanban className="h-8 w-8 text-primary mb-4" />
        </div>
        <CardTitle className="text-lg">{project.name}</CardTitle>
        <CardDescription className="line-clamp-2 h-[40px]">
          Kelola laporan dan progres untuk proyek ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Owner: {project.owner?.displayName || '...'}</span>
        </div>
        <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{project.memberUids.length} Anggota</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/proyek/${project.id}`}>
            Buka Proyek <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ProjectHubPage() {
  const { projects, loading, addProject } = useProjects();
  const { user } = useAuth();
  const [isProjectDialogOpen, setProjectDialogOpen] = React.useState(false);

  const handleAddProject = async (projectName: string) => {
    if (!user) return;
    try {
      await addProject(projectName);
      setProjectDialogOpen(false); // Close dialog on success
    } catch (e) {
      // toast is handled in the context
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-6 w-3/4 mt-4" /></CardHeader>
              <CardContent className="space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent>
              <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Pusat Proyek</h2>
          <Button onClick={() => setProjectDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Buat Proyek Baru
          </Button>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-card p-8 rounded-lg">
            <FolderPlus className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-2xl font-bold">Mulai dengan Proyek Pertama Anda</h3>
            <p className="mt-2 max-w-md text-muted-foreground">
              Buat proyek untuk berkolaborasi dengan tim Anda dan lacak semua laporan di satu tempat terpusat.
            </p>
            <Button className="mt-6" onClick={() => setProjectDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Proyek Baru
            </Button>
          </div>
        )}
      </div>

      <ProjectDialog 
        isOpen={isProjectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onAddProject={handleAddProject}
      />
    </>
  );
}
