
'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Observation } from '@/lib/types';
import { RiskBadge, StatusBadge } from './status-badges';
import { Sparkles } from 'lucide-react';

interface ViewDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  observation: Observation | null;
}

export function ViewDetailsDialog({ isOpen, onOpenChange, observation }: ViewDetailsDialogProps) {
  if (!observation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Observation Details: {observation.referenceId || observation.id}</DialogTitle>
          <DialogDescription>
            {observation.company} - {observation.location}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-4">
            {observation.photoUrl && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image
                  src={observation.photoUrl}
                  alt={`Observation at ${observation.location}`}
                  fill
                  className="object-contain"
                  data-ai-hint="construction site"
                />
              </div>
            )}
            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm items-center">
              <div className="font-semibold text-muted-foreground">Submitted On</div>
              <div>{new Date(observation.date).toLocaleString()}</div>

              <div className="font-semibold text-muted-foreground">Submitted By</div>
              <div>{observation.submittedBy}</div>

              <div className="font-semibold text-muted-foreground">Category</div>
              <div>{observation.category}</div>

              <div className="font-semibold text-muted-foreground">Status</div>
              <div><StatusBadge status={observation.status} /></div>

              <div className="font-semibold text-muted-foreground">Risk Level</div>
              <div><RiskBadge riskLevel={observation.riskLevel} /></div>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">Findings</h4>
              <p className="text-sm text-muted-foreground">{observation.findings}</p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">Recommendation</h4>
              <p className="text-sm text-muted-foreground">{observation.recommendation}</p>
            </div>

            {(observation.aiSummary || observation.aiRisks || observation.aiSuggestedActions) && (
              <div className="space-y-4 pt-4 mt-4 border-t">
                 <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI-Generated Analysis
                    </h4>
                    {observation.aiSummary && (
                      <div className="space-y-1">
                        <h5 className="font-semibold text-sm">Summary</h5>
                        <p className="text-sm text-muted-foreground">{observation.aiSummary}</p>
                      </div>
                    )}
                    {observation.aiRisks && (
                      <div className="space-y-1">
                        <h5 className="font-semibold text-sm">Potential Risks</h5>
                        <p className="text-sm text-muted-foreground">{observation.aiRisks}</p>
                      </div>
                    )}
                     {observation.aiSuggestedActions && (
                      <div className="space-y-1">
                        <h5 className="font-semibold text-sm">Suggested Actions</h5>
                        <p className="text-sm text-muted-foreground">{observation.aiSuggestedActions}</p>
                      </div>
                    )}
                 </div>
              </div>
            )}


            {observation.status === 'Completed' && (
              <div className="space-y-4 pt-4 border-t mt-4">
                <h4 className="font-semibold text-base">Action Taken</h4>
                 <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm items-start">
                   <div className="font-semibold text-muted-foreground">Description</div>
                   <div className="text-muted-foreground">{observation.actionTakenDescription || '-'}</div>
                   
                   {observation.closedDate && (
                    <>
                      <div className="font-semibold text-muted-foreground">Closed On</div>
                      <div className="text-muted-foreground">{new Date(observation.closedDate).toLocaleString()}</div>
                    </>
                   )}

                   <div className="font-semibold text-muted-foreground">Closed By</div>
                   <div className="text-muted-foreground">{observation.closedBy || '-'}</div>
                 </div>
                
                {observation.actionTakenPhotoUrl && (
                  <div className="relative w-full aspect-video rounded-md overflow-hidden border mt-2">
                    <Image
                      src={observation.actionTakenPhotoUrl}
                      alt="Action taken photo"
                      fill
                      className="object-contain"
                      data-ai-hint="fixed pipe"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
