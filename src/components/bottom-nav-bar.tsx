
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Jurnal', icon: ClipboardList },
    { href: '/beranda', label: 'Beranda', icon: Home },
    { href: '/tasks', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t">
      <div className="grid h-full grid-cols-3 mx-auto">
        {navItems.map((item) => {
          // Special handling for root path to match both '/' and '/beranda' for now, if beranda is the new home
          // Let's make it strict. Jurnal is '/', Beranda is '/beranda'
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center font-medium px-5 hover:bg-muted/50 transition-colors',
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
