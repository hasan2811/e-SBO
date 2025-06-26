'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { Observation } from '@/lib/types';
import { TakeActionDialog } from '@/components/take-action-dialog';
import { RiskBadge, StatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, FileText, ShieldAlert, ListChecks, Gavel, CheckCircle2, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';

export default function ObservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { observations, updateObservation, retryAiAnalysis } = useObservations();
  const [isActionDialogOpen, setActionDialogOpen] = React.useState(false);

  const id = typeof params.id === 'string' ? params.id : '';
  
  const observation = React.useMemo(() => {
    return observations.find(obs => obs.id === id);
  }, [observations, id]);

  if (!observation) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        {/* Image Skeleton */}
        <Skeleton className="w-full aspect-video rounded-md" />
        {/* Details Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  const handleUpdate = async (obsId: string, data: Partial<Observation>) => {
    await updateObservation(obsId, data);
    setActionDialogOpen(false);
  };
  
  const handleTakeAction = () => {
    setActionDialogOpen(true);
  };
  
  const handleRetry = () => {
    retryAiAnalysis(observation);
  };

  const showAiSection = observation.aiStatus || observation.aiSummary;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight">
            Observation: {observation.referenceId || observation.id}
          </h2>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
          <div className="space-y-6 pb-8 pr-4">
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
              
              <div className="font-semibold text-muted-foreground">Company</div>
              <div>{observation.company}</div>

              <div className="font-semibold text-muted-foreground">Location</div>
              <div>{observation.location}</div>

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

            {showAiSection && (
              <div className="space-y-4 pt-4 mt-4 border-t">
                 <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      HSSE Tech Analysis
                    </h4>

                    {observation.aiStatus === 'processing' && (
                      <div className="flex items-center gap-3 p-4 rounded-lg">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">AI analysis is in progress. This may take a moment...</p>
                      </div>
                    )}

                    {observation.aiStatus === 'failed' && (
                      <div className="flex flex-col items-start gap-3 bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                          <p className="text-sm text-destructive font-medium">The AI analysis could not be completed.</p>
                          <Button variant="destructive" size="sm" onClick={handleRetry}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry Analysis
                          </Button>
                      </div>
                    )}

                    {observation.aiStatus === 'completed' && (
                      <>
                        {observation.aiSummary && (
                          <div className="space-y-1">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Summary
                            </h5>
                            <p className="text-sm text-muted-foreground pl-6">{observation.aiSummary}</p>
                          </div>
                        )}
                        {observation.aiRisks && (
                          <div className="space-y-1">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4 text-destructive" />
                                Potential Risks
                            </h5>
                            <p className="text-sm text-muted-foreground whitespace-pre-line pl-6">{observation.aiRisks}</p>
                          </div>
                        )}
                        {observation.aiSuggestedActions && (
                            <div className="space-y-1">
                              <h5 className="font-semibold text-sm flex items-center gap-2">
                                <ListChecks className="h-4 w-4 text-green-600" />
                                Suggested Actions
                              </h5>
                              <div className="pl-6 space-y-1">
                                {observation.aiSuggestedActions.split('\n').filter(line => line.trim().replace(/^- /, '').length > 0).map((action, index) => (
                                  <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span>{action.replace(/^- /, '')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        {observation.aiRelevantRegulations && (
                          <div className="space-y-1">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                              <Gavel className="h-4 w-4 text-muted-foreground" />
                              Relevant Regulations & Procedures
                            </h5>
                            <p className="text-sm text-muted-foreground whitespace-pre-line pl-6">{observation.aiRelevantRegulations}</p>
                          </div>
                        )}
                      </>
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
            
            {observation.status !== 'Completed' && (
              <div className="pt-6 mt-6 border-t">
                <Button type="button" onClick={handleTakeAction} className="w-full">
                  <Gavel className="mr-2 h-4 w-4" />
                  Take Action
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <TakeActionDialog
            isOpen={isActionDialogOpen}
            onOpenChange={setActionDialogOpen}
            observation={observation}
            onUpdate={handleUpdate}
        />
    </div>
  );
}
