
'use client';

import * as React from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
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
import { approvePtwAndStampPdf } from '@/lib/actions/ptw-actions'; // Import server action

interface ApprovePtwDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ptw: Ptw;
}

export function ApprovePtwDialog({ isOpen, onOpenChange, ptw }: ApprovePtwDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const sigCanvasRef = React.useRef<SignatureCanvas>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSave = async () => {
    if (!userProfile) {
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
      const approverName = `${userProfile.displayName} (${userProfile.position || 'N/A'})`;

      // Call the server action instead of updating DB from client
      await approvePtwAndStampPdf(ptw, approverName, signatureDataUrl);

      toast({
        title: 'PTW Approved!',
        description: `Permit ${ptw.referenceId} has been successfully approved and stamped.`,
      });
      onOpenChange(false); // The real-time listener will update the UI
    } catch (error) {
      console.error('Failed to approve PTW:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not save the approval. Please try again.';
      toast({ variant: 'destructive', title: 'Approval Failed', description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) { // Prevent closing while submitting
        if (!open) {
          clearSignature();
        }
        onOpenChange(open);
    }
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
            Review the details and provide your signature to approve this PTW. This action will stamp the PDF.
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
                // Optimize for frequent readback operations (getting data URL)
                willReadFrequently: true,
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
