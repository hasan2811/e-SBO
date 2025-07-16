
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Wrench, FileSignature, BrainCircuit, Crane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

export function BottomNavBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: `/proyek/${projectId}/observasi`, label: 'Observation', icon: ClipboardList, activeColor: 'text-primary', borderColor: 'border-primary' },
    { href: `/proyek/${projectId}/inspeksi`, label: 'Inspection', icon: Wrench, activeColor: 'text-chart-2', borderColor: 'border-chart-2' },
    { href: `/proyek/${projectId}/ptw`, label: 'PTW', icon: FileSignature, activeColor: 'text-chart-5', borderColor: 'border-chart-5' },
    { href: `/proyek/${projectId}/angkat`, label: 'Lifting', icon: Crane, activeColor: 'text-cyan-500', borderColor: 'border-cyan-500' },
    { href: `/proyek/${projectId}/analisis`, label: 'Analysis', icon: BrainCircuit, activeColor: 'text-accent', borderColor: 'border-accent' },
  ];

  if (!projectId) return null;

  const activeItem = navItems.find(item => 
    pathname === item.href || 
    (item.label === 'Observation' && pathname === `/proyek/${projectId}`)
  );
  
  const activeBorderColor = activeItem ? activeItem.borderColor : 'border-border';

  return (
    <nav className={cn(
        "md:hidden fixed bottom-0 left-0 z-40 w-full h-16 bg-card border-t-2 transition-colors duration-300",
        activeBorderColor
    )}>
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.label === 'Observation' && pathname === `/proyek/${projectId}`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-2 hover:bg-muted/50 transition-colors',
                isActive ? item.activeColor : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

    