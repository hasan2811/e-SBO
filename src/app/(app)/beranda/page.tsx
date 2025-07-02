

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FolderKanban, PlusCircle, Users, User, ArrowRight, FolderPlus, LogIn, AlertTriangle, Loader2 } from 'lucide-react';
import { ProjectDialog } from '@/components/project-dialog';
import { useAuth } from '@/hooks/use-auth';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, runTransaction, arrayUnion } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


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
  const { projects, loading, error } = useProjects();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProjectDialogOpen, setProjectDialogOpen] = React.useState(false);
  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);

  const handleAddProject = async (projectName: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Anda harus login untuk membuat proyek.' });
      throw new Error("Anda harus login untuk membuat proyek.");
    }
    
    try {
      const newProjectRef = doc(collection(db, 'projects'));
      const userDocRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const newProjectData = {
          id: newProjectRef.id,
          name: projectName,
          ownerUid: user.uid,
          memberUids: [user.uid],
          createdAt: new Date().toISOString(),
        };

        // 1. Create the new project document
        transaction.set(newProjectRef, newProjectData);
        
        // 2. Add the new project's ID to the user's profile
        transaction.update(userDocRef, {
          projectIds: arrayUnion(newProjectRef.id)
        });
      });
      
      toast({
        title: 'Proyek Dibuat!',
        description: 'Proyek baru Anda akan segera muncul di daftar.',
      });

    } catch (err) {
       const error = err as Error;
       console.error("GAGAL MEMBUAT PROYEK:", error);
       const errorMessage = error instanceof Error ? error.message : "Terjadi galat yang tidak diketahui.";
       toast({
         variant: "destructive",
         title: "Pembuatan Proyek Gagal",
         description: errorMessage,
       });
       throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
         <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Memuat data proyek...</p>
            </div>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Pusat Proyek</h2>
          <div className="flex items-center gap-2">
              <Button onClick={() => setProjectDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Proyek
              </Button>
              <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
                <LogIn className="mr-2 h-4 w-4" />
                Gabung Proyek
              </Button>
          </div>
        </div>

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Gagal Memuat Proyek</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        )}

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          !error && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-card p-8 rounded-lg">
              <FolderPlus className="h-16 w-16 text-muted-foreground" />
              <h3 className="mt-4 text-2xl font-bold">Mulai Perjalanan Anda</h3>
              <p className="mt-2 max-w-md text-muted-foreground">
                Anda belum bergabung dengan proyek apa pun. Buat proyek baru untuk berkolaborasi, atau bergabunglah dengan proyek yang sudah ada.
              </p>
            </div>
          )
        )}
      </div>

      <ProjectDialog 
        isOpen={isProjectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onAddProject={handleAddProject}
      />
      <JoinProjectDialog
        isOpen={isJoinDialogOpen}
        onOpenChange={setJoinDialogOpen}
      />
    </>
  );
}
