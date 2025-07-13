
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ObservationContext } from '@/contexts/observation-context';
import dynamic from 'next/dynamic';

// Lazy load the ApprovePtwDialog to reduce initial JS load, as it contains signature pad logic
const ApprovePtwDialog = dynamic(() => import('@/components/approve-ptw-dialog').then(mod => mod.ApprovePtwDialog), { ssr: false });


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
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isApproveDialogOpen, setApproveDialogOpen] = React.useState(false);
  
  const { projects } = useProjects();
  const { userProfile } = useAuth();
  const { getPtwById } = React.useContext(ObservationContext)!;
  
  const ptw = ptwId ? getPtwById(ptwId) : null;
  
  React.useEffect(() => {
    if (isOpen && !ptw) {
      onOpenChange(false);
    }
  }, [isOpen, ptw, onOpenChange]);

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const projectName = ptw?.projectId ? projects.find(p => p.id === ptw.projectId)?.name : null;
  const project = ptw ? projects.find(p => p.id === ptw.projectId) : null;
  const isOwner = project?.ownerUid === userProfile?.uid;
  const userRoles = (userProfile && project?.roles) ? (project.roles[userProfile.uid] || {}) : {};
  const hasApprovalPermission = isOwner || userRoles.canApprovePtw;
  const canApprove = ptw?.status === 'Pending Approval' && hasApprovalPermission;
  const canDelete = ptw && userProfile && (isOwner || ptw.userId === userProfile.uid);
  
  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent hideCloseButton className="w-full sm:max-w-lg p-0 flex flex-col">
          {ptw ? (
            <>
              <SheetHeader className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => onOpenChange(false)}>
                          <ArrowLeft />
                      </Button>
                      <div className="flex flex-col">
                          <SheetTitle>PTW Details</SheetTitle>
                          <SheetDescription>{ptw.referenceId}</SheetDescription>
                      </div>
                  </div>
                  {canDelete && (
                    <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} className="flex-shrink-0" aria-label="Delete PTW">
                        <Trash2 />
                    </Button>
                  )}
                </div>
              </SheetHeader>
              
              <ScrollArea className="flex-1">
                <div className="space-y-6 p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Permit Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DetailRow icon={User} label="Submitted By" value={ptw.submittedBy} />
                      <DetailRow icon={Calendar} label="Date Submitted" value={format(new Date(ptw.date), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })} />
                      <DetailRow icon={Building} label="Contractor" value={ptw.contractor} />
                      <DetailRow icon={MapPin} label="Location" value={ptw.location} />
                      {projectName && <DetailRow icon={Folder} label="Project" value={projectName} />}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Description & Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Work Description</h4>
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
                        <CardTitle>Approval Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <DetailRow icon={Check} label="Approved By" value={ptw.approver} />
                          <DetailRow icon={Calendar} label="Date Approved" value={ptw.approvedDate ? format(new Date(ptw.approvedDate), 'd MMM yyyy, HH:mm', { locale: indonesianLocale }) : ''} />
                          {ptw.signatureDataUrl && (
                            <div>
                               <h4 className="text-sm text-muted-foreground mb-2">Signature</h4>
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
                        <CardTitle>Attached Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Original JSA Document</h4>
                            <Button asChild variant="secondary" className="w-full">
                                <a href={ptw.jsaPdfUrl} target="_blank" rel="noopener noreferrer">
                                    <FileText />
                                    View JSA (Original)
                                    <ExternalLink className="ml-auto" />
                                </a>
                            </Button>
                        </div>

                        {(ptw.status === 'Approved' || ptw.status === 'Closed') && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Approved Document</h4>
                                    {ptw.stampedPdfUrl ? (
                                        <Button asChild variant="outline" className="w-full">
                                            <a href={ptw.stampedPdfUrl} target="_blank" rel="noopener noreferrer">
                                                <Check className="text-green-500"/>
                                                View JSA (Stamped)
                                                <ExternalLink className="ml-auto" />
                                            </a>
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <p className="text-sm">Processing document stamp...</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                  </Card>

                </div>
              </ScrollArea>
               {canApprove && (
                <SheetFooter className="p-4 border-t mt-auto">
                  <Button type="button" onClick={() => setApproveDialogOpen(true)} className="w-full">
                    <PenSquare />
                    Approve & Sign
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
      
      {ptw && (
        <>
            <DeletePtwDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                ptw={ptw}
                onSuccess={handleDeleteSuccess}
            />
            {isApproveDialogOpen && (
              <ApprovePtwDialog
                  isOpen={isApproveDialogOpen}
                  onOpenChange={setApproveDialogOpen}
                  ptw={ptw}
              />
            )}
        </>
      )}
    </>
  );
}
