
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Observation, RiskLevel, Scope, ObservationCategory } from '@/lib/types';
import { TakeActionDialog } from '@/components/take-action-dialog';
import { StatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, FileText, ShieldAlert, ListChecks, Gavel, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Activity, Target, UserCheck, Star, Globe, ArrowLeft, Folder, ThumbsUp, MessageCircle, Eye, Info, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { StarRating } from './star-rating';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DeleteObservationDialog } from './delete-observation-dialog';
import { useObservations } from '@/hooks/use-observations';
import { usePathname } from 'next/navigation';

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

export function ObservationDetailSheet({ observationId, isOpen, onOpenChange }: ObservationDetailSheetProps) {
  const { projects } = useProjects();
  const { user } = useAuth();
  const { getObservationById, handleLikeToggle, handleViewCount, removeItem, shareToPublic, retryAnalysis } = useObservations();
  const pathname = usePathname();

  const [isActionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const viewCountedRef = React.useRef<string | null>(null);

  const observation = observationId ? getObservationById(observationId) : null;
  const mode = observation?.scope || (pathname.startsWith('/public') ? 'public' : 'private');
  
  React.useEffect(() => {
    if (isOpen && observationId && mode === 'public') {
        if (viewCountedRef.current !== observationId) {
            handleViewCount(observationId);
            viewCountedRef.current = observationId;
        }
    }
  }, [isOpen, observationId, mode, handleViewCount]);

  if (!observation) return null;
  
  const isOwner = user && observation.userId === user.uid;
  const canDelete = isOwner && mode !== 'public';
  const canTakeAction = observation.status !== 'Completed' && mode !== 'public';

  const projectName = observation.projectId ? projects.find(p => p.id === observation.projectId)?.name : null;
  const categoryDefinition = categoryDefinitions[observation.category];

  const handleTakeAction = () => setActionDialogOpen(true);

  const handleShare = async () => {
    if (!observation) return;
    setIsSharing(true);
    await shareToPublic(observation);
    setIsSharing(false);
  };
  
  const handleRetryAnalysis = async () => {
    if (!observation) return;
    await retryAnalysis(observation);
  };

  const canShare = observation.scope !== 'public' && !observation.isSharedPublicly;
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
  
  const riskStyles: Record<RiskLevel, string> = {
    Low: 'bg-chart-2 border-transparent text-primary-foreground',
    Medium: 'bg-chart-4 border-transparent text-secondary-foreground',
    High: 'bg-chart-5 border-transparent text-secondary-foreground',
    Critical: 'bg-destructive border-transparent text-destructive-foreground',
  };

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
                        <SheetTitle>Detail Observasi</SheetTitle>
                        <SheetDescription>{observation.referenceId || observation.id}</SheetDescription>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {canShare && (
                        <Button variant="outline" size="icon" onClick={handleShare} disabled={isSharing} className="flex-shrink-0" aria-label="Bagikan ke Publik">
                            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Hapus Observasi">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
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
            {observation.scope !== 'public' && observation.isSharedPublicly && (
              <Alert className="bg-primary/10 border-primary/20 text-primary-foreground">
                <Globe className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-semibold">Laporan ini bersifat Publik</AlertTitle>
                <AlertDescription className="text-primary/90">
                  Laporan ini telah dibagikan ke feed publik dan dapat dilihat oleh semua pengguna.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm items-center">
              <div className="font-semibold text-muted-foreground">Dikirim Pada</div>
              <div>{format(new Date(observation.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })}</div>

              <div className="font-semibold text-muted-foreground">Dikirim Oleh</div>
              <div>{observation.submittedBy}</div>
              
              {mode !== 'public' && (
                <>
                  <div className="font-semibold text-muted-foreground">Perusahaan</div>
                  <div>{observation.company}</div>

                  <div className="font-semibold text-muted-foreground">Lokasi</div>
                  <div>{observation.location}</div>
                </>
              )}

              {projectName && (
                <>
                  <div className="font-semibold text-muted-foreground flex items-center gap-1.5"><Folder className="h-4 w-4"/>Proyek</div>
                  <div>{projectName}</div>
                </>
              )}

              <div className="font-semibold text-muted-foreground">Kategori</div>
              <div>{observation.category}</div>

              <div className="font-semibold text-muted-foreground">Status</div>
              <div><StatusBadge status={observation.status} /></div>

              <div className="font-semibold text-muted-foreground">Tingkat Risiko</div>
              <div>
                 <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", riskStyles[observation.riskLevel])}>
                    {observation.riskLevel}
                </div>
              </div>
            </div>

            <Separator />
            
            {mode === 'public' && (
              <>
                <div className="flex items-center justify-around">
                    <button
                        onClick={() => handleLikeToggle(observation.id)}
                        className={cn(
                            "flex flex-col items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors",
                            (observation.likes || []).includes(user?.uid || '') && "text-primary font-semibold"
                        )}
                    >
                        <ThumbsUp className={cn("h-5 w-5", (observation.likes || []).includes(user?.uid || '') && "fill-current")} />
                        <span>{observation.likeCount || 0} Suka</span>
                    </button>
                    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                        <MessageCircle className="h-5 w-5" />
                        <span>{observation.commentCount || 0} Komentar</span>
                    </div>
                     <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-5 w-5" />
                        <span>{observation.viewCount || 0} Dilihat</span>
                    </div>
                </div>
                <Separator />
              </>
            )}
            
            {categoryDefinition && (
              <Alert className="border-primary/50 bg-primary/5 text-primary">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="font-semibold">{observation.category}</AlertTitle>
                <AlertDescription className="text-primary/90">
                  {categoryDefinition}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <h4 className="font-semibold">Temuan</h4>
              <p className="text-sm text-muted-foreground">{observation.findings}</p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">Rekomendasi</h4>
              <p className="text-sm text-muted-foreground">{observation.recommendation}</p>
            </div>

            {showAiSection && (
              <div className="space-y-4 pt-4 mt-4 border-t">
                 <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Analisis HSSE Tech
                    </h4>

                    {observation.aiStatus === 'processing' && (
                      <div className="flex items-center gap-3 p-4 rounded-lg">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Analisis AI sedang diproses...</p>
                      </div>
                    )}

                    {observation.aiStatus === 'failed' && (
                      <div className="flex flex-col items-start gap-3 bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                          <p className="text-sm text-destructive font-medium">Analisis AI tidak dapat diselesaikan.</p>
                          <Button variant="destructive" size="sm" onClick={handleRetryAnalysis}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Coba Lagi Analisis
                          </Button>
                      </div>
                    )}

                    {observation.aiStatus === 'completed' && (
                      <div className="space-y-4">
                        {observation.aiObserverSkillRating && observation.aiObserverSkillExplanation && (
                          <div className="space-y-2 p-4 bg-card rounded-md shadow-sm">
                            <div className="flex items-center justify-between">
                              <h5 className="font-semibold flex items-center gap-2 text-sm">
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                                Wawasan Observer
                              </h5>
                              <StarRating rating={observation.aiObserverSkillRating} />
                            </div>
                            <p className="text-sm text-muted-foreground italic pl-6">{observation.aiObserverSkillExplanation}</p>
                          </div>
                        )}

                       <Accordion type="multiple" defaultValue={['summary']} className="w-full">
                        {observation.aiSummary && (
                          <AccordionItem value="summary">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Ringkasan
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
                                Saran Tingkat Risiko
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pl-8">
                                <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", riskStyles[observation.aiSuggestedRiskLevel])}>
                                    {observation.aiSuggestedRiskLevel}
                                </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {observation.aiRootCauseAnalysis && (
                          <AccordionItem value="rootCause">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                Analisis Akar Penyebab
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
                                Potensi Risiko
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
                                  Saran Tindakan
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
                                Peraturan Terkait
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              {renderBulletedList(observation.aiRelevantRegulations, Gavel, "text-muted-foreground")}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {observation.status === 'Completed' && (
              <div className="space-y-4 pt-4 border-t mt-4">
                <h4 className="font-semibold text-base">Tindakan yang Diambil</h4>
                 <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm items-start">
                    <div className="font-semibold text-muted-foreground self-start">Deskripsi</div>
                    <div className="text-muted-foreground">
                      {observation.actionTakenDescription ? (
                        <div className="space-y-1">
                          {observation.actionTakenDescription.split('\n').filter(line => line.trim().replace(/^- /, '').length > 0).map((line, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                              <span className="break-words">{line.replace(/^- /, '')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </div>
                   
                   {observation.closedDate && (
                    <>
                      <div className="font-semibold text-muted-foreground">Ditutup Pada</div>
                      <div className="text-muted-foreground">{format(new Date(observation.closedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })}</div>
                    </>
                   )}

                   <div className="font-semibold text-muted-foreground">Ditutup Oleh</div>
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
          </div>
        </ScrollArea>
        {canTakeAction && (
          <SheetFooter className="p-4 border-t mt-auto">
            <Button type="button" onClick={handleTakeAction} className="w-full">
              <Gavel className="mr-2 h-4 w-4" />
              Ambil Tindakan
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
    
    {canDelete && observation && (
      <DeleteObservationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          observation={observation}
          onSuccess={() => {
            onOpenChange(false);
            removeItem(observation.id);
          }}
      />
    )}

    {mode !== 'public' && observation && (
      <TakeActionDialog
          isOpen={isActionDialogOpen}
          onOpenChange={setActionDialogOpen}
          observation={observation}
      />
    )}
    </>
  );
}
