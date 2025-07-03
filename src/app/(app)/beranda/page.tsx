
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, Folder, AlertCircle, FolderPlus, Users } from 'lucide-react';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function ProjectHubPage() {
  const { projects, loading, error } = useProjects();
  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
  
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((project) => (
                <Link key={project.id} href={`/proyek/${project.id}`} className="block h-full">
                    <Card className="h-full flex flex-col hover:border-primary transition-colors duration-200">
                        <CardHeader className="flex-1">
                            <CardTitle className="flex items-start gap-3">
                                <Folder className="text-primary mt-1 flex-shrink-0"/> 
                                <span className="flex-1">{project.name}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow pt-2">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {project.memberUids?.length || 0} anggota
                            </div>
                        </CardContent>
                    </Card>
                </Link>
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
