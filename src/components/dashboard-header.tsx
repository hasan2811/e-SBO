
'use client';

import * as React from 'react';
import { FilePlus2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAccountSheet } from '@/components/user-account-sheet';
import { AppLogo } from '@/components/app-logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NotificationSheet } from './notification-sheet';
import { AnimatePresence, motion } from 'framer-motion';

interface DashboardHeaderProps {
  projectName: string | null;
  onNewObservation: () => void;
  onNewInspection: () => void;
  onNewPtw: () => void;
}

export function DashboardHeader({ projectName, onNewObservation, onNewInspection, onNewPtw }: DashboardHeaderProps) {
  return (
    <>
      <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <AppLogo />
              <div className="relative ml-3 h-8 flex items-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={projectName || 'hsse-tech'}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-[150px] sm:max-w-xs">
                      {projectName || 'HSSE Tech'}
                    </h1>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <FilePlus2 className="mr-2" />
                        New Entry
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onNewObservation}>New Observation</DropdownMenuItem>
                      <DropdownMenuItem onClick={onNewInspection}>New Inspection</DropdownMenuItem>
                      <DropdownMenuItem onClick={onNewPtw}>New PTW</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              <NotificationSheet />
              <UserAccountSheet />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
