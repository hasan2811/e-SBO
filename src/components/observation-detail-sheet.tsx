
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Observation, ObservationCategory } from '@/lib/types';
import { TakeActionDialog } from '@/components/take-action-dialog';
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
import { useObservations } from '@/hooks/use-observations';
import { runDeeperAnalysis, retryAiAnalysis } from '@/lib/actions/ai-actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const categoryDefinitions: Record<ObservationCategory, string> = {
  'Safe Zone Position': 'Berada di posisi yang aman terlindung dari bahaya seperti peralatan bergerak, benda jatuh, atau pelepasan energi.',
  'Permit to Work': 'Memastikan izin kerja yang sah telah dikeluarkan dan dipahami sebelum memulai pekerjaan yang berisiko tinggi.',
  'Isolation': 'Memastikan semua sumber energi berbahaya telah diisolasi, dikunci, dan diuji sebelum memulai pekerjaan pada peralatan.',
  'Confined Space Entry': 'Mematuhi prosedur masuk ruang terbatas yang aman, termasuk pengujian atmosfer dan rencana penyelamatan.',
  'Lifting Operations': 'Mengikuti rencana pengangkatan yang aman, tidak pernah berjalan di bawah beban yang diangkat, dan memastikan peralatan layak pakai.',
  'Fit to Work': 'Memastikan kondisi fisik dan mental siap untuk bekerja, bebas dari pengaruh alkohol atau obat-obatan terlarang.',
  'Working at Height': 'Menggunakan pelindung jatuh yang tepat (seperti full body harness) saat bekerja di ketinggian lebih dari 1.8 meter.',
  'Personal Flotation Device': 'Mengenakan perangkat pelampung pribadi (PFD) saat bekerja di atas atau di dekat air.',
  'System Override': 'Mendapatkan otorisasi sebelum menonaktifkan atau meng-override sistem keselamatan kritis.',
  'Asset Integrity': 'Memastikan peralatan dan fasilitas dijaga dalam kondisi aman dan layak pakai sesuai standar.',
  'Driving Safety': 'Mematuhi peraturan lalu lintas, tidak menggunakan ponsel saat mengemudi, dan selalu mengenakan sabuk pengaman.',
  'Environment': 'Mencegah pencemaran, mengelola limbah dengan benar, dan melaporkan tumpahan atau insiden lingkungan.',
  'Signage & Warning': 'Memperhatikan dan mematuhi semua rambu keselamatan, barikade, dan sinyal peringatan di area kerja.',
  'Personal Protective Equipment (PPE)': 'Menggunakan Alat Pelindung Diri (APD) yang sesuai dan dalam kondisi baik untuk setiap pekerjaan.',
  'Emergency Response Preparedness': 'Mengetahui prosedur darurat, lokasi peralatan darurat (seperti APAR, P3K), dan jalur evakuasi.',
  'Management of Change (MOC)': 'Mengelola perubahan pada proses, peralatan, atau personel melalui evaluasi risiko dan otorisasi formal.',
  'Incident Reporting & Investigation': 'Melaporkan semua insiden dan nearmiss, serta berpartisipasi dalam investigasi untuk mencegah terulang kembali.',
  'Safety Communication': 'Berkomunikasi secara efektif tentang bahaya dan kontrol keselamatan, misalnya saat toolbox meeting atau JSA.',
  'Excavation Management': 'Memastikan galian aman dari keruntuhan, mengidentifikasi utilitas bawah tanah, dan mengontrol akses.',
  'Competence & Training': 'Memastikan hanya personel yang kompeten dan terlatih yang melakukan tugas, dan terus mengembangkan keterampilan.',
  'Supervision': 'Memberikan pengawasan yang memadai di lapangan untuk memastikan pekerjaan dilakukan dengan aman sesuai prosedur.',
};

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
  const { user, userProfile } = useAuth();
  const { getObservationById } = useObservations();
  const { toast } = useToast();

  const observation = observationId ? getObservationById(observationId) : null;
  
  const [isActionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const handleCloseSheet = () => {
    onOpenChange(false);
  };
  
  if (!observation) return null;
  
  const isAiEnabled = userProfile?.aiEnabled ?? false;
  const canTakeAction = observation.status !== 'Completed' && user?.uid === observation.userId;
  const projectName = observation.projectId ? projects.find(p => p.id === observation.projectId)?.name : null;
  const categoryDefinition = categoryDefinitions[observation.category];
  const hasDeepAnalysis = observation.aiRisks && observation.aiObserverSkillRating;

  const handleRetryAnalysis = async () => {
    if (!observation) return;
    try {
      await retryAiAnalysis(observation);
      toast({ title: 'Analisis diulang', description: 'Analisis AI telah dimulai ulang untuk laporan ini.' });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Gagal Mencoba Ulang Analisis' });
    }
  };
  
  const handleRunDeeperAnalysis = async () => {
    if (!observation || !userProfile) return;
    setIsAnalyzing(true);
    try {
      await runDeeperAnalysis(observation.id, userProfile);
      toast({ title: 'Analisis Mendalam Selesai', description: 'Wawasan baru dari AI telah ditambahkan ke laporan ini.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Analisis Gagal', description: 'Gagal menjalankan analisis mendalam.'})
    } finally {
        setIsAnalyzing(false);
    }
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
                        <SheetTitle>Detail Observasi</SheetTitle>
                        <SheetDescription>{observation.referenceId || observation.id}</SheetDescription>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Hapus Observasi">
                        <Trash2 className="h-4 w-4" />
                    </Button>
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
                        data-ai-hint="site observation"
                    />
                </div>
            )}

            <Card>
                <CardHeader><CardTitle>Detail Laporan</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <DetailRow icon={User} label="Dikirim Oleh" value={observation.submittedBy} />
                    <DetailRow icon={Calendar} label="Tanggal Kirim" value={format(new Date(observation.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />
                    <DetailRow icon={Building} label="Perusahaan" value={observation.company} />
                    <DetailRow icon={MapPin} label="Lokasi" value={observation.location} />
                    {projectName && <DetailRow icon={Folder} label="Proyek" value={projectName} />}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Status & Kategori</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <DetailRow icon={Activity} label="Status" value={<StatusBadge status={observation.status} />} />
                    <DetailRow icon={ShieldAlert} label="Tingkat Risiko" value={<RiskBadge riskLevel={observation.riskLevel} />} />
                    <DetailRow icon={Tag} label="Kategori" value={observation.category} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Temuan & Rekomendasi</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Temuan</h4>
                        <p className="text-sm text-muted-foreground">{observation.findings}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Rekomendasi</h4>
                        <p className="text-sm text-muted-foreground">{observation.recommendation}</p>
                    </div>
                </CardContent>
            </Card>

            {isAiEnabled && observation.aiStatus !== 'n/a' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Analisis HSSE Tech
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {observation.aiStatus === 'processing' && (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">AI sedang menganalisis...</p>
                      </div>
                  )}
                  {observation.aiStatus === 'failed' && (
                      <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Analisis Gagal</AlertTitle>
                          <AlertDescription>
                              Analisis AI tidak dapat diselesaikan.
                              <Button variant="link" size="sm" onClick={handleRetryAnalysis} className="p-0 h-auto ml-2 text-destructive">Coba lagi</Button>
                          </AlertDescription>
                      </Alert>
                  )}
                  {observation.aiStatus === 'completed' && (
                    <div className="space-y-4">
                      {observation.aiSuggestedRiskLevel && (
                         <DetailRow icon={Activity} label="Saran Tingkat Risiko" value={<RiskBadge riskLevel={observation.aiSuggestedRiskLevel} />} />
                      )}
                      
                      {hasDeepAnalysis ? (
                        <div className="space-y-2">
                          <Separator className="my-4"/>
                          <Accordion type="multiple" className="w-full">
                              {typeof observation.aiObserverSkillRating === 'number' && (
                                  <AccordionItem value="observerRating">
                                      <AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-muted-foreground" />Kualitas Laporan</div></AccordionTrigger>
                                      <AccordionContent className="pt-2 pl-8 space-y-2">
                                          <StarRating rating={observation.aiObserverSkillRating} />
                                          {observation.aiObserverSkillExplanation && <p className="text-sm text-muted-foreground">{observation.aiObserverSkillExplanation}</p>}
                                      </AccordionContent>
                                  </AccordionItem>
                              )}
                              {observation.aiRisks && (
                                  <AccordionItem value="risks"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Potensi Risiko</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(observation.aiRisks, AlertTriangle, "text-destructive")}</AccordionContent></AccordionItem>
                              )}
                              {observation.aiSuggestedActions && (
                                  <AccordionItem value="actions"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-green-600" />Saran Tindakan</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(observation.aiSuggestedActions, CheckCircle2, "text-green-600")}</AccordionContent></AccordionItem>
                              )}
                              {observation.aiRootCauseAnalysis && (
                                  <AccordionItem value="rootCause"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" />Analisis Akar Masalah</div></AccordionTrigger><AccordionContent className="pt-2"><p className="text-sm text-muted-foreground pl-8">{observation.aiRootCauseAnalysis}</p></AccordionContent></AccordionItem>
                              )}
                              {observation.aiRelevantRegulations && (
                                  <AccordionItem value="regulations" className="border-b-0"><AccordionTrigger className="text-sm font-semibold hover:no-underline"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Referensi Regulasi</div></AccordionTrigger><AccordionContent className="pt-2">{renderBulletedList(observation.aiRelevantRegulations, FileText, "text-muted-foreground")}</AccordionContent></AccordionItem>
                              )}
                          </Accordion>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-3 p-4 rounded-lg border border-dashed">
                           <p className="text-sm text-muted-foreground">Jalankan analisis mendalam untuk wawasan lebih lanjut mengenai risiko, tindakan, dan lainnya.</p>
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

            {observation.status === 'Completed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Tindakan Penyelesaian</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow icon={User} label="Ditutup Oleh" value={observation.closedBy} />
                  {observation.closedDate && <DetailRow icon={Calendar} label="Tanggal Ditutup" value={format(new Date(observation.closedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />}
                  {observation.actionTakenDescription && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Deskripsi Tindakan</h4>
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
                       <h4 className="font-semibold text-sm mb-2">Foto Penyelesaian</h4>
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
              <Gavel className="mr-2 h-4 w-4" />
              Ambil Tindakan & Selesaikan
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
    
    <DeleteObservationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        observation={observation}
        onSuccess={handleCloseSheet}
    />

    <TakeActionDialog
        isOpen={isActionDialogOpen}
        onOpenChange={setActionDialogOpen}
        observation={observation}
    />
    </>
  );
}
