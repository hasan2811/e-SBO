
'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Observation, RiskLevel } from '@/lib/types';

export const RiskBadge = ({ riskLevel }: { riskLevel: RiskLevel }) => {
  const riskStyles: Record<RiskLevel, string> = {
    Low: 'bg-chart-2 border-transparent text-primary-foreground hover:bg-chart-2/80',
    Medium: 'bg-chart-4 border-transparent text-secondary-foreground hover:bg-chart-4/80',
    High: 'bg-chart-5 border-transparent text-secondary-foreground hover:bg-chart-5/80',
    Critical: 'bg-destructive border-transparent text-destructive-foreground hover:bg-destructive/80',
  };
  return <Badge className={cn(riskStyles[riskLevel])}>{riskLevel}</Badge>;
};

export const StatusBadge = ({ status }: { status: Observation['status'] }) => {
   const statusStyles: Record<Observation['status'], string> = {
    Pending: 'bg-chart-5/80 border-transparent text-secondary-foreground hover:bg-chart-5/70',
    'In Progress': 'bg-chart-4/80 border-transparent text-secondary-foreground hover:bg-chart-4/70',
    Completed: 'bg-chart-2/80 border-transparent text-primary-foreground hover:bg-chart-2/70',
  };
  
  return <Badge className={cn('font-semibold', statusStyles[status])}>{status}</Badge>;
};
