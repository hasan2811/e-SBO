
'use client';

import * as React from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useObservations } from '@/hooks/use-observations';
import type { Ptw } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, PenSquare, Trash2 } from 'lucide-react';
import { approvePtw as approvePtwAction } from '@/lib/actions/db-actions';

interface ApprovePtwDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ptw: Ptw;
}

export function ApprovePtwDialog({ isOpen, onOpenChange, ptw }: ApprovePtwDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const sigCanvasRef = React.useRef<SignatureCanvas>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { updateItem } = useObservations();

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSave = async () => {
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }
    if (sigCanvasRef.current?.isEmpty()) {
      toast({ variant: 'destructive', title: 'Signature Required', description: 'Please provide your signature.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureDataUrl = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png') || '';
      
      const updatedPtw = await approvePtwAction({
          ptwId: ptw.id, 
          signatureDataUrl, 
          approverName: userProfile.displayName, 
          approverPosition: userProfile.position
      });

      updateItem(updatedPtw); // Explicitly update context state

      toast({
        title: 'PTW Approved!',
        description: `Permit ${ptw.referenceId} has been successfully approved.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to approve PTW:', error);
      toast({ variant: 'destructive', title: 'Approval Failed', description: 'Could not save the approval. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      clearSignature();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5" />
            Approve Permit to Work
          </DialogTitle>
          <DialogDescription>
            Review the details and provide your signature to approve this PTW. This action is final.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <label className="text-sm font-medium text-muted-foreground">Signature</label>
          <div className="mt-2 w-full h-48 rounded-md border border-input bg-background overflow-hidden">
             <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                className: 'w-full h-full',
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={clearSignature} disabled={isSubmitting}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Save
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
