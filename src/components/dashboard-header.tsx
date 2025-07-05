
'use client';

import * as React from 'react';
import { ChevronsUpDown, Check, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAccountSheet } from '@/components/user-account-sheet';
import { AppLogo } from '@/components/app-logo';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { NotificationSheet } from './notification-sheet';
import { useProjects } from '@/hooks/use-projects';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function ProjectSwitcher() {
  const [open, setOpen] = React.useState(false);
  const { projects, loading } = useProjects();
  const router = useRouter();
  const pathname = usePathname();
  
  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;
  const selectedProject = projects.find((p) => p.id === projectId);

  if (loading) {
    return <Button variant="ghost" className="w-full sm:w-[250px] justify-start" disabled>Loading...</Button>;
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-auto text-lg font-bold p-1 sm:p-2 h-auto justify-start"
        >
          <span className="truncate max-w-[200px] sm:max-w-[300px]">
            {selectedProject ? selectedProject.name : "HSSE Tech"}
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
                  <Folder className={cn("mr-2 h-4 w-4")} />
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
