
'use client';

import * as React from 'react';
import { FilePlus2, ChevronDown, ChevronsUpDown, Check, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAccountSheet } from '@/components/user-account-sheet';
import { AppLogo } from '@/components/app-logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { NotificationSheet } from './notification-sheet';
import { useProjects } from '@/hooks/use-projects';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DashboardHeaderProps {
  projectName: string | null;
  onNewObservation: () => void;
  onNewInspection: () => void;
  onNewPtw: () => void;
}

function ProjectSwitcher() {
  const [open, setOpen] = React.useState(false);
  const { projects, loading } = useProjects();
  const router = useRouter();
  const pathname = usePathname();
  
  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;
  const selectedProject = projects.find((p) => p.id === projectId);

  if (loading) {
    return <Button variant="outline" role="combobox" className="w-[200px] justify-between" disabled>Loading...</Button>;
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-[200px] justify-between"
        >
          <span className="truncate">
            {selectedProject ? selectedProject.name : "Pilih Proyek..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Cari proyek..." />
          <CommandList>
            <CommandEmpty>Proyek tidak ditemukan.</CommandEmpty>
            <CommandGroup>
               <CommandItem
                  onSelect={() => {
                    router.push('/beranda');
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Folder className={cn("mr-2 h-4 w-4", !projectId ? "opacity-100" : "opacity-0")} />
                  Project Hub
               </CommandItem>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    router.push(`/proyek/${project.id}`);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProject?.id === project.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


export function DashboardHeader({ onNewObservation, onNewInspection, onNewPtw }: DashboardHeaderProps) {
  return (
    <>
      <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/beranda" aria-label="Home">
                <AppLogo />
              </Link>
              <div className="hidden sm:block">
                <ProjectSwitcher />
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <FilePlus2 className="mr-2" />
                        Buat Laporan
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onNewObservation}>Laporan Observasi Baru</DropdownMenuItem>
                      <DropdownMenuItem onClick={onNewInspection}>Laporan Inspeksi Baru</DropdownMenuItem>
                      <DropdownMenuItem onClick={onNewPtw}>Izin Kerja (PTW) Baru</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              <NotificationSheet />
              <UserAccountSheet />
            </div>
          </div>
          <div className="sm:hidden flex items-center pb-3">
             <ProjectSwitcher />
          </div>
        </div>
      </header>
    </>
  );
}
