
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, FileSignature, FileText } from 'lucide-react';

import { uploadFile } from '@/lib/storage';
import type { Ptw, Location, Scope } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';


const LOCATIONS = ['International', 'National', 'Local', 'Regional'] as const;

const formSchema = z.object({
  location: z.enum(LOCATIONS),
  workDescription: z.string().min(10, { message: 'Deskripsi pekerjaan minimal 10 karakter.' }),
  contractor: z.string().min(3, { message: 'Nama kontraktor minimal 3 karakter.' }),
  jsaPdf: z
    .instanceof(File, { message: 'File JSA (PDF) wajib diunggah.' })
    .refine((file) => file.type === 'application/pdf', 'File harus dalam format PDF.')
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
  isPublic: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitPtwDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPtw: (ptw: Omit<Ptw, 'id'>) => Promise<void>;
}

export function SubmitPtwDialog({ isOpen, onOpenChange, onAddPtw }: SubmitPtwDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: LOCATIONS[0],
      workDescription: '',
      contractor: '',
      isPublic: false,
    },
    mode: 'onChange',
  });

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

  const onSubmit = async (values: FormValues) => {
    if (!user || !userProfile) return;
    if (!values.jsaPdf) {
      toast({ variant: 'destructive', title: 'PDF Wajib', description: 'Silakan unggah file JSA.' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const jsaPdfUrl = await uploadFile(values.jsaPdf, 'ptw-jsa', user.uid, setUploadProgress);
      
      const scope: Scope = values.isPublic ? 'public' : 'private';
      
      const newPtwData: Omit<Ptw, 'id'> = {
        userId: user.uid,
        date: new Date().toISOString(),
        submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
        location: values.location as Location,
        workDescription: values.workDescription,
        contractor: values.contractor,
        jsaPdfUrl,
        status: 'Pending Approval',
        scope,
        projectId: null, // Always set to null for simplicity
      };

      await onAddPtw(newPtwData);
      toast({ title: 'Sukses!', description: `Permit to Work baru berhasil diajukan.` });
      onOpenChange(false);
    } catch (error) {
      console.error("Submission failed: ", error);
      toast({ variant: 'destructive', title: 'Pengajuan Gagal', description: error instanceof Error ? error.message : 'Tidak dapat menyimpan PTW.' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Submit New PTW</DialogTitle>
          <DialogDescription>Isi detail di bawah untuk mengajukan Izin Kerja (Permit to Work) baru.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="location" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Lokasi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
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
                    <Input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isSubmitting} />
                  </FormControl>
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                    <Upload className="mr-2 h-4 w-4" />{fileName ? 'Ganti File' : 'Pilih File PDF'}
                  </Button>
                  {fileName && <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /><span>{fileName}</span></div>}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Bagikan ke Publik
                      </FormLabel>
                      <FormDescription>
                        Jika aktif, PTW ini akan dapat dilihat oleh semua pengguna.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2">
          {isSubmitting && uploadProgress !== null && (
            <div className="w-full"><Progress value={uploadProgress} className="w-full" /><p className="text-center text-xs mt-1 text-muted-foreground">Mengunggah: {Math.round(uploadProgress)}%</p></div>
          )}
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" form={formId} disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengajukan...</> : 'Ajukan PTW'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    