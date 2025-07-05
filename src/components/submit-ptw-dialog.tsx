
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, FileSignature, FileText } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

import type { Ptw, Location, Project, Scope } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/storage';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePathname } from 'next/navigation';
import { DEFAULT_LOCATIONS } from '@/lib/types';


const formSchema = z.object({
  location: z.string().min(1),
  workDescription: z.string().min(10, { message: 'Deskripsi pekerjaan minimal 10 karakter.' }),
  contractor: z.string().min(3, { message: 'Nama kontraktor minimal 3 karakter.' }),
  jsaPdf: z
    .instanceof(File, { message: 'File JSA (PDF) wajib diunggah.' })
    .refine((file) => file.type === 'application/pdf', 'File harus dalam format PDF.')
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitPtwDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function SubmitPtwDialog({ isOpen, onOpenChange, project }: SubmitPtwDialogProps) {
  const [fileName, setFileName] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const locationOptions = React.useMemo(() => 
    (project?.customLocations && project.customLocations.length > 0) ? project.customLocations : DEFAULT_LOCATIONS,
  [project]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workDescription: '',
      contractor: '',
    },
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            location: locationOptions[0],
            workDescription: '',
            contractor: '',
        });
        setFileName(null);
        setIsSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen, form, locationOptions]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = formSchema.shape.jsaPdf.safeParse(file);
      if (validation.success) {
        form.setValue('jsaPdf', file, { shouldValidate: true });
        setFileName(file.name);
      } else {
        form.setValue('jsaPdf', undefined, { shouldValidate: true });
        setFileName(null);
        toast({ variant: 'destructive', title: 'File tidak valid', description: validation.error.issues[0].message });
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    if (!user || !userProfile || !values.jsaPdf) {
        toast({ variant: 'destructive', title: 'Data tidak lengkap' });
        return;
    }
    setIsSubmitting(true);
    
    const handleBackgroundSubmit = async () => {
      try {
          const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
          const projectId = match ? match[1] : null;

          const jsaPdfUrl = await uploadFile(values.jsaPdf!, 'ptw-jsa', userProfile.uid, () => {}, projectId);

          const scope: Scope = projectId ? 'project' : 'private';
          const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          
          const newPtwData: Omit<Ptw, 'id'> = {
              itemType: 'ptw',
              userId: userProfile.uid,
              date: new Date().toISOString(),
              submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
              location: values.location as Location,
              workDescription: values.workDescription,
              contractor: values.contractor,
              jsaPdfUrl: jsaPdfUrl,
              scope,
              projectId,
              referenceId,
              status: 'Pending Approval',
          };

          await addDoc(collection(db, 'ptws'), newPtwData);
      } catch (error) {
          console.error("Submission failed:", error);
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
          toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
      }
    };
    
    // Fire and forget background task
    handleBackgroundSubmit();

    // Optimistic UI response
    toast({ title: 'PTW Diajukan', description: `Izin kerja Anda akan segera muncul.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Submit New PTW</DialogTitle>
          <DialogDescription>Isi detail di bawah untuk mengajukan Izin Kerja baru.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="location" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Lokasi</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih lokasi"/></SelectTrigger></FormControl><SelectContent>{locationOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="contractor" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Kontraktor</FormLabel><FormControl><Input placeholder="e.g., PT. Maju Jaya" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField name="workDescription" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Deskripsi Pekerjaan</FormLabel><FormControl><Textarea placeholder="Jelaskan detail pekerjaan yang akan dilakukan." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="jsaPdf" control={form.control} render={() => (
                <FormItem><FormLabel>Unggah JSA (PDF)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  </FormControl>
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />{fileName ? 'Ganti File' : 'Pilih File PDF'}
                  </Button>
                  {fileName && <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /><span>{fileName}</span></div>}
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2">
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" form={formId} disabled={!form.formState.isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajukan PTW
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
