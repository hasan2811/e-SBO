
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, ListChecks } from 'lucide-react';

import type { Inspection } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useObservations } from '@/hooks/use-observations';
import { uploadFile } from '@/lib/storage';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  actionTakenDescription: z.string().min(1, 'Description cannot be empty.'),
  actionTakenPhoto: z
    .instanceof(File)
    .optional()
    .refine((file) => !file || file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
});

type FormValues = z.infer<typeof formSchema>;

interface FollowUpInspectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inspection?: Inspection;
}

export function FollowUpInspectionDialog({
  isOpen,
  onOpenChange,
  inspection,
}: FollowUpInspectionDialogProps) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { updateItem } = useObservations();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actionTakenDescription: '',
      actionTakenPhoto: undefined,
    },
  });
  
  const [checkedActions, setCheckedActions] = React.useState<string[]>([]);
  const userHasTyped = React.useRef(false);

  const suggestedActions = React.useMemo(() => {
    return (inspection?.aiSuggestedActions || '')
      .split('\n')
      .map(line => line.trim().replace(/^- /, ''))
      .filter(line => line.length > 0);
  }, [inspection?.aiSuggestedActions]);

  React.useEffect(() => {
    if (!userHasTyped.current) {
      const combinedDescription = checkedActions.length > 0
        ? checkedActions.map(action => `- ${action}`).join('\n')
        : '';
      form.setValue('actionTakenDescription', combinedDescription, { shouldValidate: true });
    }
  }, [checkedActions, form]);


  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setPhotoPreview(null);
      setCheckedActions([]);
      userHasTyped.current = false;
      setIsSubmitting(false);
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
  
  if (!inspection) {
    return null;
  }

  const onSubmit = (values: FormValues) => {
    if (!user || !userProfile || !inspection) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    setIsSubmitting(true);

    const closerName = `${userProfile.displayName} (${userProfile.position || 'N/A'})`;
    const optimisticUpdate: Partial<Inspection> = {
      status: 'Pass',
      actionTakenDescription: values.actionTakenDescription,
      closedBy: closerName,
      closedDate: new Date().toISOString(),
      actionTakenPhotoUrl: photoPreview || inspection.actionTakenPhotoUrl,
      actionTakenPhotoStoragePath: undefined,
    };
    const optimisticallyUpdatedInspection = { ...inspection, ...optimisticUpdate };
    
    updateItem(optimisticallyUpdatedInspection);
    toast({ title: 'Tindakan Disimpan', description: 'Laporan inspeksi sedang diperbarui.' });
    handleOpenChange(false);

    // Fire-and-forget background processing
    const handleBackgroundUpdate = async () => {
      try {
        let actionTakenPhotoUrl: string | undefined;
        let actionTakenPhotoStoragePath: string | undefined;
        if (values.actionTakenPhoto) {
          const uploadResult = await uploadFile(values.actionTakenPhoto, 'actions', user.uid, () => {}, inspection.projectId);
          actionTakenPhotoUrl = uploadResult.downloadURL;
          actionTakenPhotoStoragePath = uploadResult.storagePath;
        }

        const inspectionDocRef = doc(db, 'inspections', inspection.id);
        const finalUpdateData: Partial<Inspection> = {
            status: 'Pass',
            actionTakenDescription: values.actionTakenDescription,
            closedBy: closerName,
            closedDate: new Date().toISOString(),
        };
        if (actionTakenPhotoUrl) {
          finalUpdateData.actionTakenPhotoUrl = actionTakenPhotoUrl;
          finalUpdateData.actionTakenPhotoStoragePath = actionTakenPhotoStoragePath;
        }

        // This update will be caught by the real-time listener.
        await updateDoc(inspectionDocRef, finalUpdateData);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: 'Gagal menyimpan pembaruan. Mengembalikan perubahan.' });
        // Revert the optimistic update on failure
        updateItem(inspection);
      }
    };

    handleBackgroundUpdate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Follow-up for {inspection.referenceId || inspection.id}</DialogTitle>
          <DialogDescription>
            Provide details of the corrective action taken for this inspection.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
            <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
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
                        onChange={(e) => {
                            userHasTyped.current = e.target.value.length > 0;
                            field.onChange(e);
                        }}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                  control={form.control}
                  name="actionTakenPhoto"
                  render={() => (
                    <FormItem>
                      <FormLabel>Upload Photo of Completion (Optional)</FormLabel>
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
                          <Image src={photoPreview} alt="Action taken preview" fill sizes="(max-width: 525px) 100vw, 525px" className="object-cover" data-ai-hint="fixed equipment" />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </form>
            </Form>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2 flex-shrink-0">
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={!form.formState.isValid || form.getValues('actionTakenDescription').length === 0 || isSubmitting}>
              {isSubmitting && <Loader2 />}
              Mark as Completed
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
