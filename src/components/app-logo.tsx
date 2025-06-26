'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="InspectWise Logo"
      width={48}
      height={48}
      className={cn('h-8 w-8', className)}
      data-ai-hint="gear hardhat"
      priority
    />
  );
}
