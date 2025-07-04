
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Inspection } from '@/lib/types';
import { InspectionStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, FileText, ShieldAlert, ListChecks, CheckCircle2, Loader2, RefreshCw, AlertTriangle, ArrowLeft, Folder, Trash2, Gavel } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetFooter } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { DeleteInspectionDialog } from './delete-inspection-dialog';
import { useObservations } from '@/hooks/use-observations';
import { FollowUpInspectionDialog } from './follow-up-inspection-dialog';

interface InspectionDetailSheetProps {
    inspection: Inspection | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onItemUpdate: (updatedItem: Inspection) => void; // Kept for consistency, but context handles updates
}

export function InspectionDetailSheet({ inspection, isOpen, onOpenChange, onItemUpdate }: InspectionDetailSheetProps) {
  const { projects } = useProjects();
  const { user } = useAuth();
  const { removeItem, retryAnalysis } = useObservations();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isFollowUpOpen, setFollowUpOpen] = React.useState(false);

  if (!inspection) return null;

  const projectName = inspection.projectId ? projects.find(p => p.id === inspection.projectId)?.name : null;
  const isOwner = user && inspection.userId === user.uid;
  const canDelete = isOwner;
  const canFollowUp = inspection.status === 'Fail' || inspection.status === 'Needs Repair';

  const handleRetry = async () => {
    if (!inspection) return;
    await retryAnalysis(inspection);
  };

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
  
  const handleSuccessDelete = () => {
    removeItem(inspection.id);
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent hideCloseButton className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </SheetClose>
                <div className="flex flex-col">
                  <SheetTitle>Inspection Details</SheetTitle>
                  <SheetDescription>{inspection.referenceId || inspection.id}</SheetDescription>
                </div>
              </div>
              {canDelete && (
                <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Hapus Inspeksi">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              {inspection.photoUrl && (
                <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                  <Image
                    src={inspection.photoUrl}
                    alt={`Inspection of ${inspection.equipmentName}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 512px"
                    className="object-contain"
                    data-ai-hint="equipment inspection"
                  />
                </div>
              )}
              <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm items-center">
                <div className="font-semibold text-muted-foreground">Submitted On</div>
                <div>{format(new Date(inspection.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })}</div>

                <div className="font-semibold text-muted-foreground">Submitted By</div>
                <div>{inspection.submittedBy}</div>
                
                <div className="font-semibold text-muted-foreground">Location</div>
                <div>{inspection.location}</div>
                
                {projectName && (
                  <>
                    <div className="font-semibold text-muted-foreground flex items-center gap-1.5"><Folder className="h-4 w-4"/>Project</div>
                    <div>{projectName}</div>
                  </>
                )}

                <div className="font-semibold text-muted-foreground">Equipment</div>
                <div>{inspection.equipmentName} ({inspection.equipmentType})</div>

                <div className="font-semibold text-muted-foreground">Status</div>
                <div><InspectionStatusBadge status={inspection.status} /></div>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold">Findings</h4>
                <p className="text-sm text-muted-foreground">{inspection.findings}</p>
              </div>
              
              {inspection.recommendation && (
                <div className="space-y-1">
                  <h4 className="font-semibold">Recommendation</h4>
                  <p className="text-sm text-muted-foreground">{inspection.recommendation}</p>
                </div>
              )}

              {inspection.aiStatus && (
                <div className="space-y-4 pt-4 mt-4 border-t">
                   <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary space-y-4">
                      <h4 className="font-semibold text-base flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        HSSE Tech Analysis
                      </h4>

                      {inspection.aiStatus === 'processing' && (
                        <div className="flex items-center gap-3 p-4 rounded-lg">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">AI analysis is in progress...</p>
                        </div>
                      )}

                      {inspection.aiStatus === 'failed' && (
                        <div className="flex flex-col items-start gap-3 bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                            <p className="text-sm text-destructive font-medium">The AI analysis could not be completed.</p>
                            <Button variant="destructive" size="sm" onClick={handleRetry}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Retry Analysis
                            </Button>
                        </div>
                      )}

                      {inspection.aiStatus === 'completed' && (
                        <Accordion type="multiple" defaultValue={['summary']} className="w-full">
                          {inspection.aiSummary && (
                            <AccordionItem value="summary">
                              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  Summary
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <p className="text-sm text-muted-foreground pl-8">{inspection.aiSummary}</p>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          {inspection.aiRisks && (
                            <AccordionItem value="risks">
                              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="h-4 w-4 text-destructive" />
                                  Potential Risks
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                 {renderBulletedList(inspection.aiRisks, AlertTriangle, "text-destructive")}
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          {inspection.aiSuggestedActions && (
                            <AccordionItem value="actions" className="border-b-0">
                              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                  <div className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-green-600" />
                                    Suggested Actions
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                {renderBulletedList(inspection.aiSuggestedActions, CheckCircle2, "text-green-600")}
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      )}
                   </div>
                </div>
              )}

              {inspection.status === 'Pass' && inspection.actionTakenDescription && (
                  <div className="space-y-4 pt-4 border-t mt-4">
                    <h4 className="font-semibold text-base">Tindakan yang Diambil</h4>
                     <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm items-start">
                        <div className="font-semibold text-muted-foreground self-start">Deskripsi</div>
                        <div className="text-muted-foreground">
                            <div className="space-y-1">
                              {inspection.actionTakenDescription.split('\n').map((line, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                                  <span className="break-words">{line.replace(/^- /, '')}</span>
                                </div>
                              ))}
                            </div>
                        </div>
                       
                       {inspection.closedDate && (
                        <>
                          <div className="font-semibold text-muted-foreground">Diselesaikan Pada</div>
                          <div className="text-muted-foreground">{format(new Date(inspection.closedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })}</div>
                        </>
                       )}

                       <div className="font-semibold text-muted-foreground">Diselesaikan Oleh</div>
                       <div className="text-muted-foreground">{inspection.closedBy || '-'}</div>
                     </div>
                    
                    {inspection.actionTakenPhotoUrl && (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden border mt-2">
                        <Image
                          src={inspection.actionTakenPhotoUrl}
                          alt="Action taken photo"
                          fill
                          sizes="(max-width: 640px) 100vw, 512px"
                          className="object-contain"
                          data-ai-hint="fixed equipment"
                        />
                      </div>
                    )}
                  </div>
                )}

            </div>
          </ScrollArea>
           {canFollowUp && (
              <SheetFooter className="p-4 border-t mt-auto">
                <Button type="button" onClick={() => setFollowUpOpen(true)} className="w-full">
                  <Gavel className="mr-2 h-4 w-4" />
                  Tindak Lanjut & Selesaikan
                </Button>
              </SheetFooter>
            )}
        </SheetContent>
      </Sheet>
      {canDelete && inspection && (
        <DeleteInspectionDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          inspection={inspection}
          onSuccess={handleSuccessDelete}
        />
      )}
      {inspection && (
        <FollowUpInspectionDialog
          isOpen={isFollowUpOpen}
          onOpenChange={setFollowUpOpen}
          inspection={inspection}
        />
      )}
    </>
  );
}
