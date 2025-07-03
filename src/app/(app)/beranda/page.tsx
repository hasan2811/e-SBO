
'use client';

import * as React from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, Folder, AlertCircle, FolderPlus, Copy, User } from 'lucide-react';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function ProjectHubPage() {
  const { user } = useAuth();
  const { projects, loading, error } = useProjects();
  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const handleCopyId = (projectId: string) => {
    navigator.clipboard.writeText(projectId);
    toast({
      title: 'Project ID Copied!',
      description: `ID ${projectId} has been copied to your clipboard.`,
    });
  };
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Hub</h1>
            <p className="text-muted-foreground">
              Kelola, buat, atau gabung dengan proyek yang sudah ada di sini.
            </p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Button className="w-full sm:w-auto" onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus className="mr-2" />
              Buat Proyek Baru
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setJoinDialogOpen(true)}>
              <LogIn className="mr-2" />
              Gabung Proyek
            </Button>
          </div>
        </div>

        {error && (
            <Card className="border-destructive bg-destructive/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle />
                        Gagal Memuat Proyek
                    </CardTitle>
                    <CardDescription className="text-destructive/80">
                        Tidak dapat mengambil daftar proyek Anda. Ini mungkin karena masalah izin atau koneksi.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm font-medium">
                       Jika Anda yakin memiliki izin, coba muat ulang halaman ini. Jika masalah berlanjut, hubungi administrator.
                    </p>
                </CardContent>
            </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Proyek Anda</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="h-full flex flex-col">
                  <CardHeader className="flex-1">
                    <CardTitle className="flex items-start gap-3">
                      <Folder className="text-primary mt-1 flex-shrink-0"/> 
                      <span className="flex-1">{project.name}</span>
                    </CardTitle>
                  </CardHeader>
                   <CardContent className="flex-grow">
                     <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {project.memberUids?.length || 0} anggota
                     </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground space-y-1 w-full">
                        <p className="font-semibold">Project ID:</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm bg-background p-1.5 rounded-md flex-1 truncate">{project.id}</p>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleCopyId(project.id)}>
                              <Copy className="h-4 w-4"/>
                          </Button>
                        </div>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : !error ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[200px] border-dashed">
              <CardTitle>Anda Belum Bergabung dengan Proyek Apapun</CardTitle>
              <CardDescription className="mt-2 max-w-sm">
                Buat proyek baru atau gabung dengan proyek yang sudah ada untuk memulai.
              </CardDescription>
            </Card>
          ) : null}
        </div>
      </div>

      <JoinProjectDialog isOpen={isJoinDialogOpen} onOpenChange={setJoinDialogOpen} />
      <CreateProjectDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
