'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Wrench, FileSignature, BrainCircuit, ShipWheel } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: `/proyek/${projectId}/observasi`, label: 'Observasi', icon: ClipboardList },
    { href: `/proyek/${projectId}/inspeksi`, label: 'Inspeksi', icon: Wrench },
    { href: `/proyek/${projectId}/ptw`, label: 'PTW', icon: FileSignature },
    { href: `/proyek/${projectId}/analisis`, label: 'Analisis AI', icon: BrainCircuit },
    { href: `/proyek/${projectId}/angkat`, label: 'Lifting Plan', icon: ShipWheel },
  ];

  if (!projectId) return null;

  return (
    <aside className="hidden md:flex flex-col bg-card border-r w-[220px] p-4">
      <div className="flex-1">
        <nav className="grid items-start gap-2">
          {navItems.map((item) => {
            // Check if the current item is active, considering the base project path as the default for 'Observasi'
            const isActive = pathname === item.href || (item.label === 'Observasi' && pathname === `/proyek/${projectId}`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  isActive && 'bg-muted text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
