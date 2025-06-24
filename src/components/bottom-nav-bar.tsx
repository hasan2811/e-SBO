'use client';

import Link from 'next/link';
import { LayoutDashboard, ClipboardList, Database, PlusCircle } from 'lucide-react';

import { SubmitInspectionDialog } from './submit-inspection-dialog';
import type { Inspection } from '@/lib/types';

interface BottomNavBarProps {
  onAddInspection: (inspection: Inspection) => void;
}

export function BottomNavBar({ onAddInspection }: BottomNavBarProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t">
      <div className="grid h-full grid-cols-4 mx-auto">
        <Link
          href="/"
          className="inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted text-muted-foreground hover:text-primary"
        >
          <LayoutDashboard className="w-6 h-6 mb-1" />
          <span className="text-xs">Dashboard</span>
        </Link>
        <Link
          href="#"
          className="inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted text-muted-foreground hover:text-primary"
        >
          <ClipboardList className="w-6 h-6 mb-1" />
          <span className="text-xs">Tugas</span>
        </Link>
        <SubmitInspectionDialog onAddInspection={onAddInspection}>
          <button
            type="button"
            className="inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted text-primary"
          >
            <PlusCircle className="w-8 h-8 mb-1" />
            <span className="text-xs">Add</span>
          </button>
        </SubmitInspectionDialog>
        <Link
          href="#"
          className="inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted text-muted-foreground hover:text-primary"
        >
          <Database className="w-6 h-6 mb-1" />
          <span className="text-xs">Database</span>
        </Link>
      </div>
    </nav>
  );
}
