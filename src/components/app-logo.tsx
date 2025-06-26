'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-8 w-8 text-primary', className)}
    >
      <title>InspectWise Logo</title>
      <path d="M2 18a1 1 0 0 0 .8 1.6l5.2.8 1.2 2.4a1 1 0 0 0 1.6 0l1.2-2.4 5.2-.8A1 1 0 0 0 18 18h-1.8a1 1 0 0 0-.9-.6l-4.6-1.2a1 1 0 0 0-1.4 0L4.7 17.4a1 1 0 0 0-.9.6H2Z"/>
      <path d="M10 10.5V14h4v-3.5a2 2 0 0 0-4 0Z"/>
      <path d="M12 2a5 5 0 0 0-5 5v1.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a5 5 0 0 0-5-5Z"/>
    </svg>
  );
}
