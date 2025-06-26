
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
  const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
    status === 'Completed'
      ? 'default'
      : status === 'In Progress'
      ? 'secondary'
      : status === 'Pending'
      ? 'destructive'
      : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
};
