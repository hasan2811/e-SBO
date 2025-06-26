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
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-8 w-8 text-primary', className)}
    >
      <title>InspectWise Logo</title>
      <path d="M18.8 13.2a8 8 0 0 0-13.6 0" />
      <path d="M22 14H2" />
      <path d="M9 6h6v2H9z" />
      <path d="M18 10H6" />
      <path d="M16.5 14a4.5 4.5 0 0 1-9 0" />
    </svg>
  );
}
