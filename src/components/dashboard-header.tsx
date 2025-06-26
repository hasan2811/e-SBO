
'use client';

import * as React from 'react';
import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAccountSheet } from '@/components/user-account-sheet';
import { AppLogo } from '@/components/app-logo';

interface DashboardHeaderProps {
  onAddNew: () => void;
}

export function DashboardHeader({ onAddNew }: DashboardHeaderProps) {
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
                  <Button onClick={onAddNew}>
                    <FilePlus2 className="mr-2" />
                    New Observation
                  </Button>
                </div>
              <UserAccountSheet />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
