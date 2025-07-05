'use client';

import * as React from 'react';
import { ChevronsUpDown, Check, Folder, FileCog, FolderPlus, LogIn, Download, Trash2, LogOut, Home } from 'lucide-react';
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


function ProjectSwitcher() {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isCreateOpen, setCreateOpen] = React.useState(false);
  const [isJoinOpen, setJoinOpen] = React.useState(false);

  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;
  const selectedProject = projects.find((p) => p.id === projectId);
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-lg font-bold p-1 sm:p-2 h-auto justify-start text-left"
          >
            <span className="truncate max-w-[200px] sm:max-w-[300px]">
              {selectedProject ? selectedProject.name : "Project Hub"}
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
          
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                 <DropdownMenuLabel>Aksi Umum</DropdownMenuLabel>
                 <DropdownMenuItem onSelect={() => router.push('/beranda')}>
                    <Home className="mr-2"/>
                    <span>Project Hub</span>
                 </DropdownMenuItem>
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
