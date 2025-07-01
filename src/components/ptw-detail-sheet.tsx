
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Ptw } from '@/lib/types';
import { PtwStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gavel, ArrowLeft, FileText, User, Building, MapPin, Calendar, ExternalLink, PenSquare, Check, Folder } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { ApprovePtwDialog } from './approve-ptw-dialog';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { useProjects } from '@/hooks/use-projects';

interface PtwDetailSheetProps {
    ptw: Ptw | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PtwDetailSheet({ ptw, isOpen, onOpenChange }: PtwDetailSheetProps) {
  const [isApproveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const { projects } = useProjects();

  if (!ptw) return null;

  const projectName = ptw.projectId ? projects.find(p => p.id === ptw.projectId)?.name : null;

  const handleApproveClick = () => {
    setApproveDialogOpen(true);
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

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent hideCloseButton className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
              <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                      <ArrowLeft className="h-5 w-5" />
                  </Button>
              </SheetClose>
              <div className="flex flex-col">
                  <SheetTitle>PTW Details</SheetTitle>
                  <SheetDescription>{ptw.referenceId || ptw.id}</SheetDescription>
              </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            
            <div className="space-y-4 bg-card p-4 rounded-lg border">
                <DetailRow icon={Calendar} label="Submitted On" value={format(new Date(ptw.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />
                <DetailRow icon={User} label="Submitted By" value={ptw.submittedBy} />
                <DetailRow icon={Building} label="Contractor" value={ptw.contractor} />
                <DetailRow icon={MapPin} label="Location" value={ptw.location} />
                {projectName && (
                    <DetailRow icon={Folder} label="Project" value={projectName} />
                )}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Work Description</h4>
              <p className="text-sm text-muted-foreground">{ptw.workDescription}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Status</h4>
              <PtwStatusBadge status={ptw.status} />
            </div>

             {ptw.status === 'Approved' && (
              <div className="space-y-4 pt-4 mt-4 border-t">
                  <h4 className="font-semibold">Approval Details</h4>
                  <div className="space-y-4 bg-card p-4 rounded-lg border border-green-200">
                    <DetailRow icon={Check} label="Approved By" value={ptw.approver} />
                    <DetailRow icon={Calendar} label="Approved Date" value={ptw.approvedDate ? format(new Date(ptw.approvedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale }) : ''} />
                    {ptw.signatureDataUrl && (
                        <div>
                            <span className="text-sm text-muted-foreground">Signature</span>
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
            
            {ptw.status === 'Pending Approval' && (
              <div className="pt-6 mt-6 border-t">
                <Button type="button" onClick={handleApproveClick} className="w-full">
                  <PenSquare className="mr-2 h-4 w-4" />
                  Review & Approve PTW
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    {ptw && (
        <ApprovePtwDialog 
            isOpen={isApproveDialogOpen}
            onOpenChange={setApproveDialogOpen}
            ptw={ptw}
        />
    )}
    </>
  );
}
