
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, FileSignature, Wrench, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface BottomNavBarProps {
  onNewObservation: () => void;
  onNewInspection: () => void;
  onNewPtw: () => void;
}

export function BottomNavBar({ onNewObservation, onNewInspection, onNewPtw }: BottomNavBarProps) {
  const pathname = usePathname();

  const actionItems = [
    {
      label: 'Observasi',
      icon: ClipboardList,
      onClick: onNewObservation,
    },
    {
      label: 'Inspeksi',
      icon: Wrench,
      onClick: onNewInspection,
    },
    {
      label: 'PTW',
      icon: FileSignature,
      onClick: onNewPtw,
    },
  ];

  const hubIsActive = pathname.startsWith('/beranda') || pathname.startsWith('/proyek/');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t">
      <div className="grid h-full grid-cols-4 mx-auto">
        <Link
          href="/beranda"
          className={cn(
            'inline-flex flex-col items-center justify-center font-medium px-2 sm:px-5 hover:bg-muted/50 transition-colors',
            hubIsActive ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Briefcase className="w-6 h-6 mb-1" />
          <span className="text-xs">Hub</span>
        </Link>
        {actionItems.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="inline-flex flex-col items-center justify-center font-medium px-2 sm:px-5 hover:bg-muted/50 text-muted-foreground transition-colors"
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
