'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, ListChecks } from 'lucide-react';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

import { storage } from '@/lib/firebase';
import type { Observation } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

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
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  actionTakenDescription: z.string().min(1, 'Description cannot be empty.'),
  actionTakenPhoto: z
    .instanceof(File)
    .optional()
    .refine((file) => !file || file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
});

type FormValues = z.infer<typeof formSchema>;

function uploadFile(
  file: File,
  userId: string,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !userId) {
      return reject(new Error('File or user ID is missing.'));
    }
    const storageRef = ref(storage, `actions/${userId}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        reject(new Error('Could not upload file to Firebase Storage.'));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Firebase Storage get URL error:', error);
          reject(new Error('Could not get download URL.'));
        }
      }
    );
  });
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
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actionTakenDescription: '',
      actionTakenPhoto: undefined,
    },
  });

  const [checkedActions, setCheckedActions] = React.useState<string[]>([]);

  const suggestedActions = React.useMemo(() => observation.aiSuggestedActions
      ? observation.aiSuggestedActions
          .split('\n')
          .map(line => line.trim().replace(/^- /, ''))
          .filter(line => line.length > 0)
      : [], [observation.aiSuggestedActions]);

  React.useEffect(() => {
    const combinedDescription = checkedActions.map(action => `- ${action}`).join('\n');
    form.setValue('actionTakenDescription', combinedDescription, { shouldValidate: true, shouldDirty: true });
  }, [checkedActions, form]);


  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setPhotoPreview(null);
      setUploadProgress(null);
      setCheckedActions([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onOpenChange(open);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = formSchema.shape.actionTakenPhoto.safeParse(file);
      if (validation.success) {
        form.setValue('actionTakenPhoto', file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        form.setValue('actionTakenPhoto', undefined, { shouldValidate: true });
        setPhotoPreview(null);
        toast({
          variant: 'destructive',
          title: 'File tidak valid',
          description: validation.error.issues[0].message,
        });
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user || !userProfile) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to update an observation.' });
        return;
    }
    setIsSubmitting(true);
    setUploadProgress(null);
    
    try {
        const closerName = `${userProfile.displayName} (${userProfile.position || 'N/A'})`;

        const updatedData: Partial<Observation> = {
            status: 'Completed',
            actionTakenDescription: values.actionTakenDescription,
            closedBy: closerName,
            closedDate: new Date().toISOString(),
        };
        
        if (values.actionTakenPhoto) {
            const file = values.actionTakenPhoto as File;
            setUploadProgress(0);
            const actionTakenPhotoUrl = await uploadFile(file, user.uid, setUploadProgress);
            updatedData.actionTakenPhotoUrl = actionTakenPhotoUrl;
        }

        await onUpdate(observation.id, updatedData);
        
        toast({
            title: 'Success!',
            description: `Observation ${observation.referenceId || observation.id} has been marked as completed.`,
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
        setUploadProgress(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Take Action for {observation.referenceId || observation.id}</DialogTitle>
          <DialogDescription>
            Provide details of the action taken to resolve this observation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            <Form {...form}>
              <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {suggestedActions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-semibold">HSSE Tech Suggested Actions</h4>
                    </div>
                    <div className="space-y-2 rounded-md border p-3">
                      {suggestedActions.map((action, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Checkbox
                            id={`action-${index}`}
                            onCheckedChange={(checked) => {
                              setCheckedActions(prev => 
                                checked ? [...prev, action] : prev.filter(a => a !== action)
                              );
                            }}
                          />
                          <label
                            htmlFor={`action-${index}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {action}
                          </label>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="actionTakenDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the action taken, or select from the AI suggestions above."
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
                      <FormLabel>Upload Photo of Completion (Optional)</FormLabel>
                        <FormControl>
                          <Input
                              id="action-photo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handlePhotoChange}
                              disabled={isSubmitting}
                          />
                        </FormControl>
                         <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {photoPreview ? 'Change Photo' : 'Select Photo'}
                        </Button>
                      {photoPreview && (
                        <div className="mt-4 relative w-full h-48 rounded-md overflow-hidden border">
                          <Image src={photoPreview} alt="Action taken preview" fill sizes="(max-width: 525px) 100vw, 525px" className="object-cover" data-ai-hint="fixed pipe" />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2">
          {isSubmitting && uploadProgress !== null && (
            <div className="w-full">
              <Progress value={uploadProgress} />
              <p className="text-center text-xs mt-1 text-muted-foreground">Uploading: {Math.round(uploadProgress)}%</p>
            </div>
          )}
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={isSubmitting || !form.formState.isValid || form.getValues('actionTakenDescription').length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Mark as Completed'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
