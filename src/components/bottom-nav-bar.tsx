
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Wrench, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNavBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: `/proyek/${projectId}/observasi`, label: 'Observasi', icon: ClipboardList },
    { href: `/proyek/${projectId}/inspeksi`, label: 'Inspeksi', icon: Wrench },
    { href: `/proyek/${projectId}/ptw`, label: 'PTW', icon: FileSignature },
  ];

  if (!projectId) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-40 w-full h-16 bg-card border-t">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
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
