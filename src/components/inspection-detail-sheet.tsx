
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Inspection } from '@/lib/types';
import { InspectionStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, FileText, ShieldAlert, ListChecks, CheckCircle2, Loader2, RefreshCw, AlertTriangle, ArrowLeft, Folder, Trash2, Gavel, SearchCheck, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetFooter } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { DeleteInspectionDialog } from './delete-inspection-dialog';
import { useObservations } from '@/hooks/use-observations';
import { FollowUpInspectionDialog } from './follow-up-inspection-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { runDeeperInspectionAnalysis, retryAiAnalysis } from '@/lib/actions/item-actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface InspectionDetailSheetProps {
    inspectionId: string | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InspectionDetailSheet({ inspectionId, isOpen, onOpenChange }: InspectionDetailSheetProps) {
  const { projects } = useProjects();
  const { user } = useAuth();
  const { getInspectionById, updateItem, removeItem } = useObservations();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isFollowUpOpen, setFollowUpOpen] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const inspection = inspectionId ? getInspectionById(inspectionId) : null;

  const handleCloseSheet = () => {
    onOpenChange(false);
  };

  if (!inspection) return null;

  const projectName = inspection.projectId ? projects.find(p => p.id === inspection.projectId)?.name : null;
  const canFollowUp = (inspection.status === 'Fail' || inspection.status === 'Needs Repair') && user?.uid === inspection.userId;
  const hasDeepAnalysis = inspection.aiRisks && inspection.aiSuggestedActions && !inspection.aiRisks.includes('Analisis risiko tersedia');

  const handleRetry = async () => {
    if (!inspection) return;
    try {
        const updatedItem = await retryAiAnalysis(inspection);
        if (updatedItem) updateItem(updatedItem);
        toast({ title: 'Analisis diulang', description: 'Analisis AI telah dimulai ulang untuk laporan ini.' });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Gagal Mencoba Ulang Analisis' });
    }
  };
  
  const handleRunDeeperAnalysis = async () => {
    if (!inspection) return;
    setIsAnalyzing(true);
    try {
        const updatedInspection = await runDeeperInspectionAnalysis(inspection.id);
        updateItem(updatedInspection);
        toast({ title: 'Analisis Mendalam Selesai', description: 'Wawasan baru dari AI telah ditambahkan ke laporan ini.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Analisis Gagal', description: 'Gagal menjalankan analisis mendalam.' });
    } finally {
        setIsAnalyzing(false);
    }
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
    if (!inspectionId) return;
    removeItem(inspectionId);
    handleCloseSheet();
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent hideCloseButton className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={handleCloseSheet}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col">
                  <SheetTitle>Detail Inspeksi</SheetTitle>
                  <SheetDescription>{inspection.referenceId || inspection.id}</SheetDescription>
                </div>
              </div>
              <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Hapus Inspeksi">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              <div className={cn(
                  "relative w-full aspect-video rounded-md overflow-hidden border",
                  !inspection.photoUrl && "bg-muted/20 flex items-center justify-center"
              )}>
                  {inspection.photoUrl ? (
                  <Image
                      src={inspection.photoUrl}
                      alt={`Inspection of ${inspection.equipmentName}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 512px"
                      className="object-contain"
                      data-ai-hint="equipment inspection"
                  />
                  ) : (
                      <Image src="/logo.svg" alt="Default inspection image" width={80} height={80} className="opacity-50" />
                  )}
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm items-center">
                <div className="font-semibold text-muted-foreground">Tanggal Kirim</div>
                <div>{format(new Date(inspection.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })}</div>

                <div className="font-semibold text-muted-foreground">Dikirim Oleh</div>
                <div>{inspection.submittedBy}</div>
                
                <div className="font-semibold text-muted-foreground">Lokasi</div>
                <div>{inspection.location}</div>
                
                {projectName && (
                  <>
                    <div className="font-semibold text-muted-foreground flex items-center gap-1.5"><Folder className="h-4 w-4"/>Proyek</div>
                    <div>{projectName}</div>
                  </>
                )}

                <div className="font-semibold text-muted-foreground">Peralatan</div>
                <div>{inspection.equipmentName} ({inspection.equipmentType})</div>

                <div className="font-semibold text-muted-foreground">Status</div>
                <div><InspectionStatusBadge status={inspection.status} /></div>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold">Temuan</h4>
                <p className="text-sm text-muted-foreground">{inspection.findings}</p>
              </div>
              
              {inspection.recommendation && (
                <div className="space-y-1">
                  <h4 className="font-semibold">Rekomendasi</h4>
                  <p className="text-sm text-muted-foreground">{inspection.recommendation}</p>
                </div>
              )}

              {/* AI ANALYSIS SECTION */}
              <div className="space-y-4 pt-4 mt-4 border-t">
                  <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary space-y-4">
                      <h4 className="font-semibold text-base flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          Analisis HSSE Tech
                      </h4>

                      {inspection.aiStatus === 'processing' && !hasDeepAnalysis && (
                          <div className="flex items-center gap-3 p-4 rounded-lg">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">Analisis awal sedang diproses...</p>
                          </div>
                      )}
                      
                      {inspection.aiStatus === 'failed' && (
                          <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Analisis Gagal</AlertTitle>
                              <AlertDescription>
                                  Analisis AI tidak dapat diselesaikan.
                                  <Button variant="link" size="sm" onClick={handleRetry} className="p-0 h-auto ml-2 text-destructive">Coba lagi</Button>
                              </AlertDescription>
                          </Alert>
                      )}

                      {inspection.aiStatus === 'completed' && inspection.aiSummary && (
                          <p className="text-sm text-muted-foreground">{inspection.aiSummary}</p>
                      )}
                  </div>
                  
                  {/* DEEP ANALYSIS SECTION */}
                  <div className="bg-accent/5 p-4 rounded-lg border-l-4 border-accent space-y-4">
                      <h4 className="font-semibold text-base flex items-center gap-2 text-accent">
                          <SearchCheck className="h-5 w-5" />
                          Analisis HSSE Mendalam
                      </h4>
                      {isAnalyzing ? (
                          <div className="flex items-center gap-3 p-4 rounded-lg">
                              <Loader2 className="h-5 w-5 animate-spin text-accent" />
                              <p className="text-sm text-muted-foreground">Menganalisis lebih dalam...</p>
                          </div>
                      ) : hasDeepAnalysis ? (
                          <Accordion type="multiple" className="w-full">
                              {inspection.aiRisks && (
                                  <AccordionItem value="risks"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Potensi Risiko</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(inspection.aiRisks, AlertTriangle, "text-destructive")}</AccordionContent></AccordionItem>
                              )}
                              {inspection.aiSuggestedActions && (
                                  <AccordionItem value="actions" className="border-b-0"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-green-600" />Saran Tindakan</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(inspection.aiSuggestedActions, CheckCircle2, "text-green-600")}</AccordionContent></AccordionItem>
                              )}
                          </Accordion>
                      ) : (
                          <div className="flex flex-col items-start gap-3 p-2">
                              <p className="text-sm text-muted-foreground">Jalankan analisis mendalam untuk mengidentifikasi risiko dan saran tindakan.</p>
                              <Button variant="outline" onClick={handleRunDeeperAnalysis} disabled={inspection.aiStatus === 'processing'}>
                                  <SearchCheck className="mr-2 h-4 w-4" />
                                  Jalankan Analisis Mendalam
                              </Button>
                          </div>
                      )}
                  </div>
              </div>


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
                       <div className="text-muted-foreground flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {inspection.closedBy || '-'}
                        </div>
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
      <DeleteInspectionDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        inspection={inspection}
        onSuccess={handleSuccessDelete}
      />
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
