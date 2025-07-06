'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Wrench, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNavBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: `/proyek/${projectId}/observasi`, label: 'Observasi', icon: ClipboardList, activeColor: 'text-primary', borderColor: 'border-primary' },
    { href: `/proyek/${projectId}/inspeksi`, label: 'Inspeksi', icon: Wrench, activeColor: 'text-chart-2', borderColor: 'border-chart-2' },
    { href: `/proyek/${projectId}/ptw`, label: 'PTW', icon: FileSignature, activeColor: 'text-chart-5', borderColor: 'border-chart-5' },
  ];

  if (!projectId) return null;

  // Find the active item, considering the base project path as the default for 'Observasi'
  const activeItem = navItems.find(item => 
    pathname === item.href || 
    (item.label === 'Observasi' && pathname === `/proyek/${projectId}`)
  );
  
  const activeBorderColor = activeItem ? activeItem.borderColor : 'border-border';

  return (
    <nav className={cn(
        "md:hidden fixed bottom-0 left-0 z-40 w-full h-16 bg-card border-t-2 transition-colors duration-300",
        activeBorderColor
    )}>
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
        {navItems.map((item) => {
          // Check if the current item is active, with the same default logic.
          const isActive = pathname === item.href || (item.label === 'Observasi' && pathname === `/proyek/${projectId}`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 transition-colors',
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
