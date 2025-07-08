
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Observation, ObservationCategory } from '@/lib/types';
import { StatusBadge, RiskBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, FileText, ShieldAlert, ListChecks, Gavel, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Activity, Target, UserCheck, Star, ArrowLeft, Folder, Trash2, SearchCheck, User, Calendar, MapPin, Building, Tag } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { StarRating } from './star-rating';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DeleteObservationDialog } from './delete-observation-dialog';
import { ObservationContext } from '@/contexts/observation-context';
import { runDeeperAnalysis } from '@/lib/actions/ai-actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

// Lazy load the TakeActionDialog to reduce initial JS load
const TakeActionDialog = dynamic(() => import('@/components/take-action-dialog').then(mod => mod.TakeActionDialog));

interface ObservationDetailSheetProps {
    observationId: string | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        <div className="flex flex-col">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground">{value || '-'}</span>
        </div>
    </div>
);

const renderBulletedList = (text: string, Icon: React.ElementType, iconClassName: string) => (
    <div className="pl-4 space-y-2">
      {text.split('\n').filter(line => line.trim().replace(/^- /, '').length > 0).map((item, index) => (
        <div key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
          <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${iconClassName}`} />
          <span>{item.replace(/^- /, '')}</span>
        </div>
      ))}
    </div>
);

export function ObservationDetailSheet({ observationId, isOpen, onOpenChange }: ObservationDetailSheetProps) {
  const { projects } = useProjects();
  const { userProfile } = useAuth();
  const { getObservationById } = React.useContext(ObservationContext)!;
  const { toast } = useToast();

  const [isActionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [observation, setObservation] = React.useState<Observation | null>(null);
  
  React.useEffect(() => {
    if (observationId) {
      const foundObservation = getObservationById(observationId);
      if (foundObservation) {
        setObservation(foundObservation);
      }
    } else {
      setObservation(null);
    }
  }, [observationId, getObservationById, isOpen]);

  const handleSuccessfulDelete = () => {
    onOpenChange(false);
    setDeleteDialogOpen(false);
  };
  
  const handleRunDeeperAnalysis = async () => {
    if (!observation || !userProfile) return;
    setIsAnalyzing(true);
    try {
      await runDeeperAnalysis(observation.id);
      toast({ title: 'Deep Analysis Complete', description: 'New AI insights have been added to this report.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Failed to run the deep analysis.'})
    } finally {
        setIsAnalyzing(false);
    }
  }
  
  const isAiEnabled = userProfile?.aiEnabled ?? false;
  const projectName = observation?.projectId ? projects.find(p => p.id === observation.projectId)?.name : null;
  const project = observation?.projectId ? projects.find(p => p.id === observation.projectId) : null;
  const isOwner = project?.ownerUid === userProfile?.uid;
  const userRoles = (userProfile && project?.roles) ? (project.roles[userProfile.uid] || {}) : {};
  const hasActionPermission = isOwner || userRoles.canTakeAction;
  const canTakeAction = observation?.status !== 'Completed' && hasActionPermission;
  const canDelete = observation && userProfile && (isOwner || observation.userId === userProfile.uid);

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent hideCloseButton className="w-full sm:max-w-lg p-0 flex flex-col">
        {observation ? (
            <>
                <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => onOpenChange(false)}>
                                <ArrowLeft />
                            </Button>
                            <div className="flex flex-col">
                                <SheetTitle>Observation Details</SheetTitle>
                                <SheetDescription>{observation.referenceId}</SheetDescription>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                           {canDelete && (
                                <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Delete Observation">
                                    <Trash2 />
                                </Button>
                           )}
                        </div>
                    </div>
                </SheetHeader>
                
                <ScrollArea className="flex-1">
                  <div className="space-y-6 p-4">
                    {observation.photoUrl && (
                        <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                            <Image
                                src={observation.photoUrl}
                                alt={`Observation at ${observation.location}`}
                                fill
                                sizes="(max-width: 640px) 100vw, 512px"
                                className="object-contain"
                                priority
                                data-ai-hint="site observation"
                            />
                        </div>
                    )}

                    <Card>
                        <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <DetailRow icon={User} label="Submitted By" value={observation.submittedBy} />
                            <DetailRow icon={Calendar} label="Date Submitted" value={format(new Date(observation.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />
                            <DetailRow icon={Building} label="Company" value={observation.company} />
                            <DetailRow icon={MapPin} label="Location" value={observation.location} />
                            {projectName && <DetailRow icon={Folder} label="Project" value={projectName} />}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Status & Category</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <DetailRow icon={Activity} label="Status" value={<StatusBadge status={observation.status} />} />
                            <DetailRow icon={ShieldAlert} label="Risk Level" value={<RiskBadge riskLevel={observation.riskLevel} />} />
                            <DetailRow icon={Tag} label="Category" value={observation.category} />
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Findings & Recommendation</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm mb-1">Findings</h4>
                                <p className="text-sm text-muted-foreground">{observation.findings}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">Recommendation</h4>
                                <p className="text-sm text-muted-foreground">{observation.recommendation}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {isAiEnabled && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            HSSE Tech Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {observation.aiStatus === 'n/a' && (
                                <div className="flex flex-col items-start gap-3 p-4 rounded-lg border border-dashed">
                                   <p className="text-sm text-muted-foreground">Run AI analysis to get deep insights on risks, actions, and more.</p>
                                   <Button variant="outline" onClick={handleRunDeeperAnalysis} disabled={isAnalyzing}>
                                       {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchCheck className="mr-2 h-4 w-4" />}
                                       Run AI Analysis
                                   </Button>
                               </div>
                           )}
                           {observation.aiStatus === 'processing' && (
                              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  <p className="text-sm text-muted-foreground">AI is analyzing your report...</p>
                              </div>
                          )}
                          {observation.aiStatus === 'failed' && (
                              <Alert variant="destructive">
                                  <AlertTriangle />
                                  <AlertTitle>Analysis Failed</AlertTitle>
                                  <AlertDescription>
                                      An error occurred while analyzing the report.
                                      <Button variant="link" size="sm" onClick={handleRunDeeperAnalysis} className="p-0 h-auto ml-2 text-destructive">Try again</Button>
                                  </AlertDescription>
                              </Alert>
                          )}
                          {observation.aiStatus === 'completed' && (
                            <div className="space-y-4">
                              {observation.aiSummary && (
                                  <div>
                                      <h4 className="text-sm font-semibold mb-2">Quick Summary</h4>
                                      <p className="text-sm text-muted-foreground">{observation.aiSummary}</p>
                                  </div>
                              )}
                              
                                <div className="space-y-2">
                                  <Separator className="my-4"/>
                                  <h4 className="text-sm font-semibold mb-2">Deep Analysis</h4>
                                  <Accordion type="multiple" className="w-full">
                                      {typeof observation.aiObserverSkillRating === 'number' && (
                                          <AccordionItem value="observerRating">
                                              <AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-muted-foreground" />Report Quality</div></AccordionTrigger>
                                              <AccordionContent className="pt-2 pl-8 space-y-2">
                                                  <StarRating rating={observation.aiObserverSkillRating} />
                                                  {observation.aiObserverSkillExplanation && <p className="text-sm text-muted-foreground">{observation.aiObserverSkillExplanation}</p>}
                                              </AccordionContent>
                                          </AccordionItem>
                                      )}
                                      {observation.aiRisks && (
                                          <AccordionItem value="risks"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Potential Risks</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(observation.aiRisks, AlertTriangle, "text-destructive")}</AccordionContent></AccordionItem>
                                      )}
                                      {observation.aiSuggestedActions && (
                                          <AccordionItem value="actions"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-green-600" />Suggested Actions</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(observation.aiSuggestedActions, CheckCircle2, "text-green-600")}</AccordionContent></AccordionItem>
                                      )}
                                      {observation.aiRootCauseAnalysis && (
                                          <AccordionItem value="rootCause"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" />Root Cause Analysis</div></AccordionTrigger><AccordionContent className="pt-2"><p className="text-sm text-muted-foreground pl-8">{observation.aiRootCauseAnalysis}</p></AccordionContent></AccordionItem>
                                      )}
                                      {observation.aiRelevantRegulations && (
                                          <AccordionItem value="regulations" className="border-b-0"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Regulatory References</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(observation.aiRelevantRegulations, FileText, "text-muted-foreground")}</AccordionContent></AccordionItem>
                                      )}
                                  </Accordion>
                                </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {observation.status === 'Completed' && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Resolution Action</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <DetailRow icon={User} label="Closed By" value={observation.closedBy} />
                          {observation.closedDate && <DetailRow icon={Calendar} label="Date Closed" value={format(new Date(observation.closedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />}
                          {observation.actionTakenDescription && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Action Description</h4>
                                <div className="space-y-1">
                                  {observation.actionTakenDescription.split('\n').filter(line => line.trim().replace(/^- /, '').length > 0).map((line, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                                      <span className="break-words text-sm text-foreground">{line.replace(/^- /, '')}</span>
                                    </div>
                                  ))}
                                </div>
                            </div>
                          )}
                          {observation.actionTakenPhotoUrl && (
                            <div className="pt-2">
                               <h4 className="font-semibold text-sm mb-2">Resolution Photo</h4>
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
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
                {canTakeAction && (
                  <SheetFooter className="p-4 border-t mt-auto">
                    <Button type="button" onClick={() => setActionDialogOpen(true)} className="w-full">
                      <Gavel />
                      Take Action & Complete
                    </Button>
                  </SheetFooter>
                )}
            </>
        ) : (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )}
      </SheetContent>
    </Sheet>
    
    {observation && (
      <>
        <DeleteObservationDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            observation={observation}
            onSuccess={handleSuccessfulDelete}
        />
        {isActionDialogOpen && (
          <TakeActionDialog
              isOpen={isActionDialogOpen}
              onOpenChange={setActionDialogOpen}
              observation={observation}
          />
        )}
      </>
    )}
    </>
  );
}
