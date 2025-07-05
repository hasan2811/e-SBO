
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/beranda', label: 'Proyek', icon: Briefcase },
  { href: '/private', label: 'Pribadi', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col bg-card border-r w-[220px] p-4">
      <div className="flex-1">
        <nav className="grid items-start gap-2">
          {navItems.map((item) => {
            const isActive = item.href === '/beranda'
              ? pathname.startsWith('/beranda') || pathname.startsWith('/proyek/')
              : pathname === item.href;

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
