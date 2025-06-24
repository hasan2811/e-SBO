'use client';

import { FilePlus2 } from 'lucide-react';
import { Button } from './ui/button';
import { SubmitObservationDialog } from './submit-observation-dialog';
import type { Observation } from '@/lib/types';
import { UserAccountSheet } from './user-account-sheet';
import { AppLogo } from './app-logo';

interface DashboardHeaderProps {
  onAddObservation: (observation: Observation) => void;
}

export function DashboardHeader({ onAddObservation }: DashboardHeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <AppLogo />
            <h1 className="text-2xl font-bold ml-3 text-foreground">e-Observation</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:block">
                <SubmitObservationDialog onAddObservation={onAddObservation}>
                  <Button>
                    <FilePlus2 className="mr-2" />
                    New Observation
                  </Button>
                </SubmitObservationDialog>
              </div>
            <UserAccountSheet />
          </div>
        </div>
      </div>
    </header>
  );
}
