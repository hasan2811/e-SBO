
'use client';

import * as React from 'react';
import { useObservations } from '@/contexts/observation-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Observation } from '@/lib/types';
import { TakeActionDialog } from '@/components/take-action-dialog';
import { ViewDetailsDialog } from '@/components/view-details-dialog';
import { ClipboardCheck, Eye } from 'lucide-react';
import { RiskBadge, StatusBadge } from '@/components/status-badges';

const TaskCard = ({ observation }: { observation: Observation }) => {
  const { updateObservation } = useObservations();
  const [isActionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [isViewDialogOpen, setViewDialogOpen] = React.useState(false);

  const handleUpdate = async (id: string, data: Partial<Observation>) => {
    await updateObservation(id, data);
    setActionDialogOpen(false); // Close dialog on update
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{observation.company}</CardTitle>
              <CardDescription>{observation.location}</CardDescription>
            </div>
             <RiskBadge riskLevel={observation.riskLevel} />
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            <strong>Findings:</strong> {observation.findings}
          </p>
           <div className="flex justify-between items-center text-xs text-muted-foreground">
            <StatusBadge status={observation.status} />
            <span>{new Date(observation.date).toLocaleDateString()}</span>
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(true)}>
                <Eye className="mr-2 h-4 w-4" />
                View
            </Button>
            {observation.status !== 'Completed' ? (
                <Button onClick={() => setActionDialogOpen(true)}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Take Action
                </Button>
            ) : (
                <Button variant="secondary" disabled>
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
      <ViewDetailsDialog
        isOpen={isViewDialogOpen}
        onOpenChange={setViewDialogOpen}
        observation={observation}
      />
    </>
  );
};


export default function TasksPage() {
  const { observations } = useObservations();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
      </div>

       {observations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {observations.map(obs => (
                <TaskCard key={obs.id} observation={obs} />
            ))}
        </div>
      ) : (
         <div className="text-center py-16">
            <h3 className="text-xl font-semibold">No Findings Yet</h3>
            <p className="text-muted-foreground mt-2">No observations have been submitted yet. Try creating one!</p>
        </div>
      )}
    </div>
  );
}
