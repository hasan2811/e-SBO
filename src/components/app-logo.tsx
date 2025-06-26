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
      {/* A single path for a gear shape */}
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      {/* Magnifying glass */}
      <circle cx="12" cy="12" r="4" />
      <path d="m15 15 3 3" />
    </svg>
  );
}
