
'use client';

import * as React from 'react';
import type { Ptw } from '@/lib/types';
import { PtwStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gavel, ArrowLeft, FileText, User, Building, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

interface PtwDetailSheetProps {
    ptw: Ptw | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PtwDetailSheet({ ptw, isOpen, onOpenChange }: PtwDetailSheetProps) {
  const { toast } = useToast();
  
  if (!ptw) return null;

  const handleApprove = () => {
    toast({
      title: 'Fitur Dalam Pengembangan',
      description: 'Fitur persetujuan dan tanda tangan digital akan segera hadir.',
    });
  };

  const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
        <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    </div>
  );

  return (
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
                <DetailRow icon={Calendar} label="Submitted On" value={new Date(ptw.date).toLocaleString()} />
                <DetailRow icon={User} label="Submitted By" value={ptw.submittedBy} />
                <DetailRow icon={Building} label="Contractor" value={ptw.contractor} />
                <DetailRow icon={MapPin} label="Location" value={ptw.location} />
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Work Description</h4>
              <p className="text-sm text-muted-foreground">{ptw.workDescription}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Status</h4>
              <PtwStatusBadge status={ptw.status} />
            </div>

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
                <Button type="button" onClick={handleApprove} className="w-full">
                  <Gavel className="mr-2 h-4 w-4" />
                  Approve PTW
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
