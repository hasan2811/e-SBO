
'use client';

import * as React from 'react';
import { ChevronsUpDown, Check, Folder, FileCog, FolderPlus, LogIn, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAccountSheet } from '@/components/user-account-sheet';
import { AppLogo } from '@/components/app-logo';
import { NotificationSheet } from './notification-sheet';
import { useProjects } from '@/hooks/use-projects';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { ManageProjectDialog } from '@/components/manage-project-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel } from '@/lib/export';
import { useObservations } from '@/hooks/use-observations';

function ProjectSwitcher() {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const [isCreateOpen, setCreateOpen] = React.useState(false);
  const [isJoinOpen, setJoinOpen] = React.useState(false);
  const [isManageOpen, setManageOpen] = React.useState(false);

  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;
  const { items: allProjectItems } = useObservations(projectId);
  const selectedProject = projects.find((p) => p.id === projectId);

  const handleExport = () => {
    if (!selectedProject) return;
    
    if (allProjectItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Data untuk Diekspor',
        description: `Tidak ada laporan di proyek ${selectedProject.name}.`
      });
      return;
    }

    const fileName = `Export_${selectedProject.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const success = exportToExcel(allProjectItems, fileName);

    if (success) {
      toast({
        title: 'Ekspor Berhasil',
        description: `Laporan untuk ${selectedProject.name} sedang diunduh.`
      });
    } else {
       toast({
        variant: 'destructive',
        title: 'Ekspor Gagal',
        description: 'Tidak ada data valid yang ditemukan untuk diekspor.'
      });
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-lg font-bold p-1 sm:p-2 h-auto justify-start text-left"
          >
            <span className="truncate max-w-[200px] sm:max-w-[300px]">
              {selectedProject ? selectedProject.name : "HSSE Tech"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuGroup>
                <DropdownMenuLabel>Pilih Proyek</DropdownMenuLabel>
                <ScrollArea className="max-h-48">
                    {loading ? (
                        <DropdownMenuItem disabled>Memuat...</DropdownMenuItem>
                    ) : projects.length > 0 ? (
                        projects.map((project) => (
                            <DropdownMenuItem key={project.id} onSelect={() => router.push(`/proyek/${project.id}/observasi`)}>
                                <Folder className="mr-2"/>
                                <span>{project.name}</span>
                                {project.id === selectedProject?.id && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <DropdownMenuItem disabled>Tidak ada proyek</DropdownMenuItem>
                    )}
                </ScrollArea>
            </DropdownMenuGroup>
          
            {selectedProject && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Aksi Proyek</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => setManageOpen(true)}>
                            <FileCog className="mr-2"/>
                            <span>Kelola Proyek</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={handleExport}>
                            <Download className="mr-2"/>
                            <span>Export Laporan</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                 <DropdownMenuLabel>Aksi Umum</DropdownMenuLabel>
                 <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                    <FolderPlus className="mr-2"/>
                    <span>Buat Proyek Baru</span>
                 </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setJoinOpen(true)}>
                    <LogIn className="mr-2"/>
                    <span>Gabung Proyek</span>
                 </DropdownMenuItem>
            </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog isOpen={isCreateOpen} onOpenChange={setCreateOpen} />
      <JoinProjectDialog isOpen={isJoinOpen} onOpenChange={setJoinOpen} />
      {selectedProject && (
        <ManageProjectDialog
          isOpen={isManageOpen}
          onOpenChange={setManageOpen}
          project={selectedProject}
          defaultTab="members"
        />
      )}
    </>
  );
}


export function DashboardHeader() {
  return (
    <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link href="/beranda" aria-label="Home" className="flex-shrink-0">
                        <AppLogo />
                    </Link>
                    <div className="border-l pl-2 sm:pl-4">
                       <ProjectSwitcher />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationSheet />
                    <UserAccountSheet />
                </div>
            </div>
        </div>
    </header>
  );
}
