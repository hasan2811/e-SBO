
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Ptw } from '@/lib/types';
import { PtwStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gavel, ArrowLeft, FileText, User, Building, MapPin, Calendar, ExternalLink, PenSquare, Check, Folder, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { ApprovePtwDialog } from './approve-ptw-dialog';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { DeletePtwDialog } from './delete-ptw-dialog';
import { useObservations } from '@/hooks/use-observations';

interface PtwDetailSheetProps {
    ptwId: string | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PtwDetailSheet({ ptwId, isOpen, onOpenChange }: PtwDetailSheetProps) {
  const [isApproveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const { projects } = useProjects();
  const { user, userProfile } = useAuth();
  const { getPtwById, removeItem, updateItem } = useObservations();
  
  const ptw = ptwId ? getPtwById(ptwId) : null;

  const handleCloseSheet = () => {
    onOpenChange(false);
  };

  if (!ptw) return null;

  const projectName = ptw.projectId ? projects.find(p => p.id === ptw.projectId)?.name : null;
  const canApprove = ptw.status === 'Pending Approval' && user?.uid !== ptw.userId;

  const handleApproveClick = () => {
    setApproveDialogOpen(true);
  };
  
  const handleApprovalSuccess = (updatedPtw: Ptw) => {
    updateItem(updatedPtw);
    setApproveDialogOpen(false); // Close the dialog after success
  };

  const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
        <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-semibold">{value || '-'}</span>
        </div>
    </div>
  );
  
  const handleSuccessDelete = () => {
    if (ptw) {
      removeItem(ptw.id);
    }
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
                      <SheetTitle>Detail PTW</SheetTitle>
                      <SheetDescription>{ptw.referenceId || ptw.id}</SheetDescription>
                  </div>
              </div>
              <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Hapus PTW">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              
              <div className="space-y-4 bg-card p-4 rounded-lg border">
                  <DetailRow icon={Calendar} label="Tanggal Kirim" value={format(new Date(ptw.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />
                  <DetailRow icon={User} label="Dikirim Oleh" value={ptw.submittedBy} />
                  <DetailRow icon={Building} label="Kontraktor" value={ptw.contractor} />
                  <DetailRow icon={MapPin} label="Lokasi" value={ptw.location} />
                  {projectName && (
                      <DetailRow icon={Folder} label="Proyek" value={projectName} />
                  )}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Deskripsi Pekerjaan</h4>
                <p className="text-sm text-muted-foreground">{ptw.workDescription}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Status</h4>
                <PtwStatusBadge status={ptw.status} />
              </div>

               {ptw.status === 'Approved' && (
                <div className="space-y-4 pt-4 mt-4 border-t">
                    <h4 className="font-semibold">Detail Persetujuan</h4>
                    <div className="space-y-4 bg-card p-4 rounded-lg border border-green-200">
                      <DetailRow icon={Check} label="Disetujui Oleh" value={ptw.approver} />
                      <DetailRow icon={Calendar} label="Tanggal Disetujui" value={ptw.approvedDate ? format(new Date(ptw.approvedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale }) : ''} />
                      {ptw.signatureDataUrl && (
                          <div>
                              <span className="text-sm text-muted-foreground">Tanda Tangan</span>
                               <div className="mt-2 p-2 border bg-secondary rounded-md flex justify-center">
                                  <Image src={ptw.signatureDataUrl} alt="Signature" width={200} height={100} className="h-auto" data-ai-hint="signature" />
                              </div>
                          </div>
                      )}
                    </div>
                </div>
              )}


              <div className="space-y-4 pt-4 mt-4 border-t">
                <h4 className="font-semibold">Dokumen JSA</h4>
                <Button asChild variant="outline" className="w-full">
                  <a href={ptw.jsaPdfUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" />
                    Lihat JSA (PDF)
                    <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                  </a>
                </Button>
              </div>
              
              {canApprove && (
                <div className="pt-6 mt-6 border-t">
                  <Button type="button" onClick={handleApproveClick} className="w-full">
                    <PenSquare className="mr-2 h-4 w-4" />
                    Review & Setujui PTW
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      {ptw && userProfile && (
          <ApprovePtwDialog 
              isOpen={isApproveDialogOpen}
              onOpenChange={setApproveDialogOpen}
              ptw={ptw}
              onSuccess={handleApprovalSuccess}
          />
      )}
      <DeletePtwDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ptw={ptw}
        onSuccess={handleSuccessDelete}
      />
    </>
  );
}
