'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';

import type { Observation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  actionTakenDescription: z.string().min(10, 'Description must be at least 10 characters.'),
  actionTakenPhoto: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Fungsi untuk meng-upload file ke Cloud Function
async function uploadFileViaCloudFunction(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);

  // Ganti dengan URL Cloud Function Anda
  const functionUrl = 'https://us-central1-hssetech-e1710.cloudfunctions.net/uploadPhoto';

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Upload failed with status ${response.status}: ${errorBody.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.downloadUrl;
  } catch (error) {
    console.error("Cloud Function upload error:", error);
    throw new Error("Could not upload file via Cloud Function.");
  }
}

interface TakeActionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  observation: Observation;
  onUpdate: (id: string, data: Partial<Observation>) => Promise<void>;
}

export function TakeActionDialog({
  isOpen,
  onOpenChange,
  observation,
  onUpdate,
}: TakeActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actionTakenDescription: '',
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setPhotoPreview(null);
    }
    onOpenChange(open);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 10MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        form.setValue('actionTakenPhoto', file);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to update an observation.' });
        return;
    }
    setIsSubmitting(true);
    
    try {
        let actionTakenPhotoUrl: string | undefined = undefined;
        if (values.actionTakenPhoto) {
            const file = values.actionTakenPhoto as File;
            actionTakenPhotoUrl = await uploadFileViaCloudFunction(file);
        }

        const updatedData: Partial<Observation> = {
            status: 'Completed',
            actionTakenDescription: values.actionTakenDescription,
            actionTakenPhotoUrl: actionTakenPhotoUrl,
            closedBy: user.displayName || 'Anonymous User',
        };

        await onUpdate(observation.id, updatedData);
        
        toast({
            title: 'Success!',
            description: `Observation ${observation.id} has been marked as completed.`,
        });
        handleOpenChange(false);

    } catch (error) {
        console.error("Failed to update observation: ", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error instanceof Error ? error.message : 'Could not update the observation. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Take Action for {observation.id}</DialogTitle>
          <DialogDescription>
            Provide details of the action taken to resolve this observation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="actionTakenDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the action taken."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actionTakenPhoto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload Photo of Completion</FormLabel>
                  <FormControl>
                    <>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {photoPreview ? 'Change Photo' : 'Select Photo'}
                      </Button>
                    </>
                  </FormControl>
                  {photoPreview && (
                    <div className="mt-4 relative w-full h-48 rounded-md overflow-hidden border">
                      <Image src={photoPreview} alt="Action taken preview" fill className="object-cover" data-ai-hint="fixed pipe" />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Mark as Completed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
