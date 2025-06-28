
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { Observation } from '@/lib/types';
import { TakeActionDialog } from '@/components/take-action-dialog';
import { RiskBadge, StatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, FileText, ShieldAlert, ListChecks, Gavel, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Activity, Target } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';


interface ObservationDetailSheetProps {
    observation: Observation | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ObservationDetailSheet({ observation, isOpen, onOpenChange }: ObservationDetailSheetProps) {
  const { updateObservation, retryAiAnalysis } = useObservations();
  const [isActionDialogOpen, setActionDialogOpen] = React.useState(false);
  
  if (!observation) return null;

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

  const renderBulletedList = (text: string, Icon: React.ElementType, iconClassName: string) => (
    <div className="pl-8 space-y-2">
      {text.split('\n').filter(line => line.trim().replace(/^- /, '').length > 0).map((item, index) => (
        <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
          <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${iconClassName}`} />
          <span>{item.replace(/^- /, '')}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>
            Observation: {observation.referenceId || observation.id}
          </SheetTitle>
          <SheetDescription>
            Details for the selected observation.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            {observation.photoUrl && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image
                  src={observation.photoUrl}
                  alt={`Observation at ${observation.location}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 512px"
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
                          <p className="text-sm text-muted-foreground">AI analysis is in progress...</p>
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
                       <Accordion type="multiple" defaultValue={['summary']} className="w-full">
                        {observation.aiSummary && (
                          <AccordionItem value="summary">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Summary
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <p className="text-sm text-muted-foreground pl-8">{observation.aiSummary}</p>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                         {observation.aiSuggestedRiskLevel && (
                          <AccordionItem value="suggestedRisk">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                Suggested Risk Level
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pl-8">
                              <RiskBadge riskLevel={observation.aiSuggestedRiskLevel} />
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {observation.aiRootCauseAnalysis && (
                          <AccordionItem value="rootCause">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                Root Cause Analysis
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <p className="text-sm text-muted-foreground pl-8">{observation.aiRootCauseAnalysis}</p>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {observation.aiRisks && (
                          <AccordionItem value="risks">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                              <div className="flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4 text-destructive" />
                                Potential Risks
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                               {renderBulletedList(observation.aiRisks, AlertTriangle, "text-destructive")}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {observation.aiSuggestedActions && (
                          <AccordionItem value="actions">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <ListChecks className="h-4 w-4 text-green-600" />
                                  Suggested Actions
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              {renderBulletedList(observation.aiSuggestedActions, CheckCircle2, "text-green-600")}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {observation.aiRelevantRegulations && (
                          <AccordionItem value="regulations" className="border-b-0">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                               <div className="flex items-center gap-2">
                                <Gavel className="h-4 w-4 text-muted-foreground" />
                                Relevant Regulations
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              {renderBulletedList(observation.aiRelevantRegulations, Gavel, "text-muted-foreground")}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
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
                      sizes="(max-width: 640px) 100vw, 512px"
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
      </SheetContent>
    </Sheet>
    
    <TakeActionDialog
        isOpen={isActionDialogOpen}
        onOpenChange={setActionDialogOpen}
        observation={observation}
        onUpdate={handleUpdate}
    />
    </>
  );
}
