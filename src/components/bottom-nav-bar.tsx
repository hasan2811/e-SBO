'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Database, PlusCircle } from 'lucide-react';

import { SubmitObservationDialog } from './submit-observation-dialog';
import type { Observation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BottomNavBarProps {
  onAddObservation: (observation: Observation) => void;
}

export function BottomNavBar({ onAddObservation }: BottomNavBarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/tasks', icon: ClipboardList, label: 'Tugas' },
    { href: '/database', icon: Database, label: 'Database' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t">
      <div className="grid h-full grid-cols-4 mx-auto">
        <Link
          href="/"
          className={cn(
            'inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted hover:text-primary',
            pathname === '/' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <LayoutDashboard className="w-6 h-6 mb-1" />
          <span className="text-xs">Dashboard</span>
        </Link>
        <Link
          href="#"
          className={cn(
            'inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted hover:text-primary',
             pathname === '/tugas' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <ClipboardList className="w-6 h-6 mb-1" />
          <span className="text-xs">Tugas</span>
        </Link>
        <SubmitObservationDialog onAddObservation={onAddObservation}>
          <button
            type="button"
            className="inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted text-primary"
          >
            <PlusCircle className="w-8 h-8 mb-1" />
            <span className="text-xs">Add</span>
          </button>
        </SubmitObservationDialog>
        <Link
          href="#"
          className={cn(
            'inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted hover:text-primary',
            pathname === '/database' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Database className="w-6 h-6 mb-1" />
          <span className="text-xs">Database</span>
        </Link>
      </div>
    </nav>
  );
}
