'use client';

import { FilePlus2 } from 'lucide-react';
import { Button } from './ui/button';
import { SubmitInspectionDialog } from './submit-inspection-dialog';
import type { Inspection } from '@/lib/types';

interface DashboardHeaderProps {
  onAddInspection: (inspection: Inspection) => void;
}

export function DashboardHeader({ onAddInspection }: DashboardHeaderProps) {
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
              <path
                d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4Z"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M24 4V44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4Z"
                fill="currentColor"
              />
              <path
                d="M16 24L22 30L34 18"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-2xl font-bold ml-3 text-foreground">InspectWise</h1>
          </div>
          <div className="hidden md:block">
            <SubmitInspectionDialog onAddInspection={onAddInspection}>
              <Button>
                <FilePlus2 className="mr-2" />
                New Inspection
              </Button>
            </SubmitInspectionDialog>
          </div>
        </div>
      </div>
    </header>
  );
}
