
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Wrench, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: `/proyek/${projectId}/observasi`, label: 'Observasi', icon: ClipboardList },
    { href: `/proyek/${projectId}/inspeksi`, label: 'Inspeksi', icon: Wrench },
    { href: `/proyek/${projectId}/ptw`, label: 'PTW', icon: FileSignature },
  ];

  if (!projectId) return null;

  return (
    <aside className="hidden md:flex flex-col bg-card border-r w-[220px] p-4">
      <div className="flex-1">
        <nav className="grid items-start gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
