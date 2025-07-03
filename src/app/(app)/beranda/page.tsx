
'use client';

import * as React from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, Folder, AlertCircle, FolderPlus } from 'lucide-react';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function ProjectHubPage() {
  const { user } = useAuth();
  const { projects, loading, error } = useProjects();
  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
  
  const isAdmin = user?.uid === 'GzR8FeByeKhJ0vZoeo5Zj4M0Ftl2';

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Hub</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Mengelola semua proyek yang ada.' : 'Kelola atau gabung dengan proyek yang sudah ada di sini.'}
            </p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            {isAdmin && (
              <Button className="w-full sm:w-auto" onClick={() => setCreateDialogOpen(true)}>
                <FolderPlus className="mr-2" />
                Buat Proyek Baru
              </Button>
            )}
            {!isAdmin && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setJoinDialogOpen(true)}>
                <LogIn className="mr-2" />
                Gabung Proyek
              </Button>
            )}
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
                        Tidak dapat mengambil daftar proyek Anda. Ini mungkin karena indeks database sedang dibuat.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm font-medium">
                        Jika ini pertama kalinya Anda menjalankan fitur ini, Firebase mungkin meminta Anda untuk membuat indeks komposit. Silakan buka konsol developer browser (F12), cari pesan error yang berisi link, dan klik link tersebut untuk membuat indeks.
                    </p>
                    <p className="text-sm mt-2">
                        Pembuatan indeks bisa memakan waktu beberapa menit. Setelah selesai, muat ulang halaman ini.
                    </p>
                </CardContent>
            </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{isAdmin ? "Semua Proyek" : "Proyek Anda"}</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Folder className="text-primary"/> 
                      {project.name}
                    </CardTitle>
                    <CardDescription>
                      {project.memberUids?.length || 0} anggota
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : !error ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <CardTitle>{isAdmin ? "Tidak Ada Proyek" : "Anda Belum Bergabung dengan Proyek Apapun"}</CardTitle>
              <CardDescription className="mt-2 max-w-sm">
                {isAdmin ? "Buat proyek baru untuk memulai." : "Gabung dengan proyek yang sudah ada untuk mulai."}
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
