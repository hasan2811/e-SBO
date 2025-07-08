'use client';

import * as React from 'react';
import { ChevronsUpDown, Check, Folder, FileCog, FolderPlus, LogIn, Download, Trash2, LogOut, Home, PlusCircle, ClipboardList, Wrench, FileSignature } from 'lucide-react';
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
            className="w-full text-lg font-bold p-1 sm:p-2 h-auto justify-start text-left"
          >
            <span className="truncate">
              {selectedProject ? selectedProject.name : "Project Hub"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuGroup>
                 <DropdownMenuItem onSelect={() => router.push('/beranda')}>
                    <Home className="mr-2"/>
                    <span>Project Hub</span>
                 </DropdownMenuItem>
                 <DropdownMenuSeparator />
                <DropdownMenuLabel>Select Project</DropdownMenuLabel>
                <ScrollArea className="max-h-48">
                    {loading ? (
                        <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                    ) : projects.length > 0 ? (
                        projects.map((project) => (
                            <DropdownMenuItem key={project.id} onSelect={() => router.push(`/proyek/${project.id}/observasi`)}>
                                <Folder className="mr-2"/>
                                <span>{project.name}</span>
                                {project.id === selectedProject?.id && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <DropdownMenuItem disabled>No projects</DropdownMenuItem>
                    )}
                </ScrollArea>
            </DropdownMenuGroup>
          
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                 <DropdownMenuLabel>General Actions</DropdownMenuLabel>
                 <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                    <FolderPlus className="mr-2"/>
                    <span>Create New Project</span>
                 </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setJoinOpen(true)}>
                    <LogIn className="mr-2"/>
                    <span>Join Project</span>
                 </DropdownMenuItem>
            </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog isOpen={isCreateOpen} onOpenChange={setCreateOpen} />
      <JoinProjectDialog isOpen={isJoinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}

interface NewReportButtonProps {
  onNewObservation: () => void;
  onNewInspection: () => void;
  onNewPtw: () => void;
}

function NewReportButton({ onNewObservation, onNewInspection, onNewPtw }: NewReportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="hidden md:inline-flex">
          <PlusCircle className="mr-2" />
          New Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onNewObservation}>
          <ClipboardList />
          <span>New Observation</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewInspection}>
          <Wrench />
          <span>New Inspection</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewPtw}>
          <FileSignature />
          <span>New PTW</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


interface DashboardHeaderProps {
  projectId: string | null;
  onNewObservation?: () => void;
  onNewInspection?: () => void;
  onNewPtw?: () => void;
}

export function DashboardHeader({
  projectId,
  onNewObservation,
  onNewInspection,
  onNewPtw,
}: DashboardHeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-30">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <Link href="/beranda" aria-label="Home" className="flex-shrink-0">
                    <AppLogo />
                </Link>
                <div className="border-l pl-2 sm:pl-4 flex-1 min-w-0">
                   <ProjectSwitcher />
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {projectId && onNewObservation && onNewInspection && onNewPtw && (
                  <NewReportButton 
                    onNewObservation={onNewObservation}
                    onNewInspection={onNewInspection}
                    onNewPtw={onNewPtw}
                  />
                )}
                <NotificationSheet />
                <UserAccountSheet />
            </div>
        </div>
    </header>
  );
}
