
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Ptw } from '@/lib/types';
import { PtwStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ArrowLeft, FileText, User, Building, MapPin, Calendar, ExternalLink, Trash2, Loader2, PenSquare, Folder } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { DeletePtwDialog } from './delete-ptw-dialog';
import { useObservations } from '@/hooks/use-observations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ApprovePtwDialog } from './approve-ptw-dialog';
import { useToast } from '@/hooks/use-toast';

interface PtwDetailSheetProps {
    ptwId: string | null;
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

export function PtwDetailSheet({ ptwId, isOpen, onOpenChange }: PtwDetailSheetProps) {
  const [localPtw, setLocalPtw] = React.useState<Ptw | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isApproveDialogOpen, setApproveDialogOpen] = React.useState(false);

  const { projects } = useProjects();
  const { user, userProfile } = useAuth();
  const { getPtwById } = useObservations();
  const { toast } = useToast();
  
  React.useEffect(() => {
    if (isOpen && ptwId) {
      const ptwData = getPtwById(ptwId);
      if (ptwData) {
        setLocalPtw(ptwData);
      }
    }
  }, [isOpen, ptwId, getPtwById]);

  const ptw = localPtw;

  if (!ptw) return null;

  const handleSuccessfulDelete = () => {
    onOpenChange(false);
    setDeleteDialogOpen(false);
  };

  const projectName = ptw.projectId ? projects.find(p => p.id === ptw.projectId)?.name : null;
  const canApprove = ptw.status === 'Pending Approval';
  const pdfUrlToView = ptw.stampedPdfUrl || ptw.jsaPdfUrl;
  
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
                      <SheetTitle>Detail Izin Kerja</SheetTitle>
                      <SheetDescription>{ptw.referenceId || ptw.id}</SheetDescription>
                  </div>
              </div>
              <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Hapus PTW">
                <Trash2 />
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Detail Izin Kerja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow icon={User} label="Dikirim Oleh" value={ptw.submittedBy} />
                  <DetailRow icon={Calendar} label="Tanggal Kirim" value={format(new Date(ptw.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />
                  <DetailRow icon={Building} label="Kontraktor" value={ptw.contractor} />
                  <DetailRow icon={MapPin} label="Lokasi" value={ptw.location} />
                  {projectName && <DetailRow icon={Folder} label="Proyek" value={projectName} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Deskripsi & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Deskripsi Pekerjaan</h4>
                    <p className="text-sm text-muted-foreground">{ptw.workDescription}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Status</h4>
                    <PtwStatusBadge status={ptw.status} />
                  </div>
                </CardContent>
              </Card>

               {ptw.status === 'Approved' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detail Persetujuan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <DetailRow icon={Check} label="Disetujui Oleh" value={ptw.approver} />
                      <DetailRow icon={Calendar} label="Tanggal Disetujui" value={ptw.approvedDate ? format(new Date(ptw.approvedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale }) : ''} />
                      {ptw.signatureDataUrl && (
                        <div>
                           <h4 className="text-sm text-muted-foreground mb-2">Tanda Tangan</h4>
                           <div className="relative aspect-video w-full max-w-sm rounded-md border bg-muted/50 p-2">
                             <Image
                                src={ptw.signatureDataUrl}
                                alt="Signature"
                                fill
                                className="object-contain"
                                data-ai-hint="signature"
                             />
                           </div>
                        </div>
                      )}
                    </CardContent>
                </Card>
              )}


              <Card>
                <CardHeader>
                    <CardTitle>Dokumen JSA</CardTitle>
                    <CardDescription>{ptw.stampedPdfUrl ? "Dokumen yang telah disetujui dan dicap." : "Job Safety Analysis yang dilampirkan."}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <a href={pdfUrlToView} target="_blank" rel="noopener noreferrer">
                      <FileText />
                      {ptw.stampedPdfUrl ? "Lihat JSA (Telah Dicap)" : "Lihat JSA (Asli)"}
                      <ExternalLink className="ml-auto" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
           {canApprove && (
            <SheetFooter className="p-4 border-t mt-auto">
              <Button type="button" onClick={() => setApproveDialogOpen(true)} className="w-full">
                <PenSquare />
                Setujui & Tanda Tangani
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
      
      <DeletePtwDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ptw={ptw}
        onSuccess={handleSuccessfulDelete}
      />
      
      <ApprovePtwDialog
        isOpen={isApproveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        ptw={ptw}
      />
    </>
  );
}
