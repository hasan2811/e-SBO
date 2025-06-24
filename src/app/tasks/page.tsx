'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Observation, RiskLevel } from '@/lib/types';
import { TakeActionDialog } from '@/components/take-action-dialog';
import { ClipboardCheck } from 'lucide-react';

const RiskBadge = ({ riskLevel }: { riskLevel: RiskLevel }) => {
  const riskStyles: Record<RiskLevel, string> = {
    Low: 'bg-chart-2 border-transparent text-primary-foreground hover:bg-chart-2/80',
    Medium: 'bg-chart-4 border-transparent text-secondary-foreground hover:bg-chart-4/80',
    High: 'bg-chart-5 border-transparent text-secondary-foreground hover:bg-chart-5/80',
    Critical: 'bg-destructive border-transparent text-destructive-foreground hover:bg-destructive/80',
  };
  return <Badge className={cn(riskStyles[riskLevel])}>{riskLevel}</Badge>;
};

const StatusBadge = ({ status }: { status: Observation['status'] }) => {
  const variant: 'default' | 'secondary' | 'outline' =
    status === 'Completed'
      ? 'default'
      : status === 'In Progress'
      ? 'secondary'
      : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
};


const TaskCard = ({ observation }: { observation: Observation }) => {
  const { updateObservation } = useObservations();
  const [isActionDialogOpen, setActionDialogOpen] = React.useState(false);

  const handleUpdate = (id: string, data: Partial<Observation>) => {
    updateObservation(id, data);
    setActionDialogOpen(false); // Close dialog on update
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{observation.location}</CardTitle>
              <CardDescription>{observation.id}</CardDescription>
            </div>
             <RiskBadge riskLevel={observation.riskLevel} />
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
          {observation.photoUrl && (
            <div className="relative w-full h-40 rounded-md overflow-hidden">
               <Image
                  src={observation.photoUrl}
                  alt={`Observation at ${observation.location}`}
                  fill
                  className="object-cover"
                  data-ai-hint="construction site"
                />
            </div>
          )}
          <p className="text-sm text-muted-foreground line-clamp-3">
            <strong>Findings:</strong> {observation.findings}
          </p>
           <div className="flex justify-between items-center text-xs text-muted-foreground">
            <StatusBadge status={observation.status} />
            <span>{new Date(observation.date).toLocaleDateString()}</span>
          </div>
        </CardContent>
        <CardFooter>
          {observation.status !== 'Completed' && (
            <Button className="w-full" onClick={() => setActionDialogOpen(true)}>
                <ClipboardCheck className="mr-2" />
                Take Action
            </Button>
          )}
          {observation.status === 'Completed' && (
             <Button className="w-full" variant="secondary" disabled>
                Completed
            </Button>
          )}
        </CardFooter>
      </Card>
      <TakeActionDialog
        isOpen={isActionDialogOpen}
        onOpenChange={setActionDialogOpen}
        observation={observation}
        onUpdate={handleUpdate}
      />
    </>
  );
};


export default function TasksPage() {
  const { observations } = useObservations();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Semua Temuan</h2>
      </div>

       {observations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {observations.map(obs => (
                <TaskCard key={obs.id} observation={obs} />
            ))}
        </div>
      ) : (
         <div className="text-center py-16">
            <h3 className="text-xl font-semibold">Belum Ada Temuan</h3>
            <p className="text-muted-foreground mt-2">Belum ada observasi yang disubmit. Coba buat satu!</p>
        </div>
      )}
    </div>
  );
}
