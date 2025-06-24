
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, PlusCircle } from 'lucide-react';
import type { Observation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SubmitObservationDialog } from './submit-observation-dialog';

interface BottomNavBarProps {
  onAddObservation: (observation: Observation) => Promise<void>;
}

export function BottomNavBar({ onAddObservation }: BottomNavBarProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t">
      <div className="grid h-full grid-cols-3 mx-auto">
        <Link
          href="/"
          className={cn(
            'inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted',
            pathname === '/' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <LayoutDashboard className="w-6 h-6 mb-1" />
          <span className="text-xs">Dashboard</span>
        </Link>
        
        <div className="flex items-center justify-center">
          <SubmitObservationDialog onAddObservation={onAddObservation}>
            <button
              type="button"
              className="inline-flex flex-col items-center justify-center font-medium text-primary bg-primary/10 rounded-full w-12 h-12 hover:bg-primary/20"
            >
              <PlusCircle className="w-7 h-7" />
            </button>
          </SubmitObservationDialog>
        </div>

        <Link
          href="/tasks"
          className={cn(
            'inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted',
             pathname === '/tasks' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <ClipboardList className="w-6 h-6 mb-1" />
          <span className="text-xs">Tasks</span>
        </Link>
      </div>
    </nav>
  );
}
