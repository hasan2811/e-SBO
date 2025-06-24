'use client';

import { FilePlus2 } from 'lucide-react';
import { Button } from './ui/button';
import { SubmitObservationDialog } from './submit-observation-dialog';
import type { Observation } from '@/lib/types';
import { UserAccountSheet } from './user-account-sheet';

interface DashboardHeaderProps {
  onAddObservation: (observation: Observation) => void;
}

export function DashboardHeader({ onAddObservation }: DashboardHeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <svg
              className="h-8 w-auto text-primary"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" />
              <path
                d="M32 24C32 28.4183 28.4183 32 24 32C19.5817 32 16 28.4183 16 24"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M16 24H30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
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
