
'use client';

import * as React from 'react';
import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmitObservationDialog } from '@/components/submit-observation-dialog';
import type { Observation } from '@/lib/types';
import { UserAccountSheet } from '@/components/user-account-sheet';
import { AppLogo } from '@/components/app-logo';

interface DashboardHeaderProps {
  onAddObservation: (observation: Observation) => Promise<void>;
}

export function DashboardHeader({ onAddObservation }: DashboardHeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  return (
    <>
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <AppLogo />
              <h1 className="text-2xl font-bold ml-3 text-foreground">e-Observation</h1>
            </div>
            <div className="flex items-center gap-4">
               <div className="hidden md:block">
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <FilePlus2 className="mr-2" />
                    New Observation
                  </Button>
                </div>
              <UserAccountSheet />
            </div>
          </div>
        </div>
      </header>
      <SubmitObservationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAddObservation={onAddObservation}
      />
    </>
  );
}
