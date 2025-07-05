
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Inspection } from '@/lib/types';
import { InspectionStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, ShieldAlert, ListChecks, CheckCircle2, Loader2, RefreshCw, AlertTriangle, ArrowLeft, Folder, Trash2, Gavel, SearchCheck, User, Calendar, MapPin, Wrench } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { DeleteInspectionDialog } from './delete-inspection-dialog';
import { useObservationData } from '@/hooks/use-observation-data';
import { FollowUpInspectionDialog } from './follow-up-inspection-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { runDeeperInspectionAnalysis, retryAiAnalysis } from '@/lib/actions/ai-actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';


interface InspectionDetailSheetProps {
    inspectionId: string | null;
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

export function InspectionDetailSheet({ inspectionId, isOpen, onOpenChange }: InspectionDetailSheetProps) {
  const { projects } = useProjects();
  const { user, userProfile } = useAuth();
  const { getInspectionById } = useObservationData();
  const { toast } = useToast();
  
  const [localInspection, setLocalInspection] = React.useState<Inspection | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isFollowUpOpen, setFollowUpOpen] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && inspectionId) {
      const insp = getInspectionById(inspectionId);
      if (insp) {
        setLocalInspection(insp);
      }
    }
  }, [isOpen, inspectionId, getInspectionById]);

  const inspection = localInspection;

  if (!inspection) return null;
  
  const isAiEnabled = userProfile?.aiEnabled ?? false;
  const projectName = inspection.projectId ? projects.find(p => p.id === inspection.projectId)?.name : null;
  const canFollowUp = (inspection.status === 'Fail' || inspection.status === 'Needs Repair');
  const hasDeepAnalysis = inspection.aiRisks && inspection.aiSuggestedActions;

  const handleSuccessfulDelete = () => {
    onOpenChange(false); // Close the main detail sheet
    setDeleteDialogOpen(false);
  };

  const handleRetry = async () => {
    if (!inspection) return;
    try {
        await retryAiAnalysis(inspection);
        toast({ title: 'Analisis diulang', description: 'Analisis AI telah dimulai ulang untuk laporan ini.' });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Gagal Mencoba Ulang Analisis' });
    }
  };
  
  const handleRunDeeperAnalysis = async () => {
    if (!inspection || !userProfile) return;
    setIsAnalyzing(true);
    try {
        await runDeeperInspectionAnalysis(inspection.id, userProfile);
        toast({ title: 'Analisis Mendalam Selesai', description: 'Wawasan baru dari AI telah ditambahkan ke laporan ini.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Analisis Gagal', description: 'Gagal menjalankan analisis mendalam.' });
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent hideCloseButton className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => onOpenChange(false)}>
                  <ArrowLeft />
                </Button>
                <div className="flex flex-col">
                  <SheetTitle>Detail Inspeksi</SheetTitle>
                  <SheetDescription>{inspection.referenceId || inspection.id}</SheetDescription>
                </div>
              </div>
              <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Hapus Inspeksi">
                <Trash2 />
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-4">
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

              <Card>
                <CardHeader>
                    <CardTitle>Detail Laporan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow icon={Wrench} label="Peralatan" value={`${inspection.equipmentName} (${inspection.equipmentType})`} />
                  <DetailRow icon={User} label="Dikirim Oleh" value={inspection.submittedBy} />
                  <DetailRow icon={Calendar} label="Tanggal Kirim" value={format(new Date(inspection.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />
                  <DetailRow icon={MapPin} label="Lokasi" value={inspection.location} />
                  {projectName && <DetailRow icon={Folder} label="Proyek" value={projectName} />}
                </CardContent>
              </Card>

              <Card>
                 <CardHeader>
                    <CardTitle>Status & Temuan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                    <InspectionStatusBadge status={inspection.status} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Temuan</h4>
                    <p className="text-sm text-foreground">{inspection.findings}</p>
                  </div>
                  {inspection.recommendation && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Rekomendasi</h4>
                      <p className="text-sm text-foreground">{inspection.recommendation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isAiEnabled && inspection.aiStatus !== 'n/a' && (
                <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Analisis HSSE Tech
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {inspection.aiStatus === 'processing' && !hasDeepAnalysis && (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Analisis awal sedang diproses...</p>
                      </div>
                    )}
                    
                    {inspection.aiStatus === 'failed' && (
                        <Alert variant="destructive">
                            <AlertTriangle />
                            <AlertTitle>Analisis Gagal</AlertTitle>
                            <AlertDescription>
                                Analisis AI tidak dapat diselesaikan.
                                <Button variant="link" size="sm" onClick={handleRetry} className="p-0 h-auto ml-2 text-destructive">Coba lagi</Button>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {inspection.aiStatus === 'completed' && (
                      <div className="space-y-4">
                          {inspection.aiSummary && (
                              <div>
                                  <h4 className="text-sm font-semibold mb-2">Ringkasan Cepat</h4>
                                  <p className="text-sm text-muted-foreground">{inspection.aiSummary}</p>
                              </div>
                          )}
                          
                          {hasDeepAnalysis ? (
                              <div>
                                  <Separator className="my-4" />
                                  <h4 className="text-sm font-semibold mb-2">Analisis Mendalam</h4>
                                  <Accordion type="multiple" className="w-full">
                                      {inspection.aiRisks && (
                                          <AccordionItem value="risks"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Potensi Risiko</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(inspection.aiRisks, AlertTriangle, "text-destructive")}</AccordionContent></AccordionItem>
                                      )}
                                      {inspection.aiSuggestedActions && (
                                          <AccordionItem value="actions" className="border-b-0"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-green-600" />Saran Tindakan</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(inspection.aiSuggestedActions, CheckCircle2, "text-green-600")}</AccordionContent></AccordionItem>
                                      )}
                                  </Accordion>
                              </div>
                          ) : (
                              <div className="flex flex-col items-start gap-3 p-4 rounded-lg border border-dashed mt-4">
                                  <p className="text-sm text-muted-foreground">Jalankan analisis mendalam untuk mengidentifikasi risiko dan saran tindakan.</p>
                                  <Button variant="outline" onClick={handleRunDeeperAnalysis} disabled={isAnalyzing}>
                                      {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchCheck className="mr-2 h-4 w-4" />}
                                      Jalankan Analisis Mendalam
                                  </Button>
                              </div>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}


              {inspection.status === 'Pass' && inspection.actionTakenDescription && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Tindakan Penyelesaian</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DetailRow icon={User} label="Diselesaikan Oleh" value={inspection.closedBy} />
                      {inspection.closedDate && <DetailRow icon={Calendar} label="Tanggal Selesai" value={format(new Date(inspection.closedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />}
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Deskripsi Tindakan</h4>
                        <div className="space-y-1">
                          {inspection.actionTakenDescription.split('\n').map((line, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                              <span className="break-words text-foreground">{line.replace(/^- /, '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {inspection.actionTakenPhotoUrl && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Foto Penyelesaian</h4>
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
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>
          </ScrollArea>
           {canFollowUp && (
              <SheetFooter className="p-4 border-t mt-auto">
                <Button type="button" onClick={() => setFollowUpOpen(true)} className="w-full">
                  <Gavel />
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
        onSuccess={handleSuccessfulDelete}
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
