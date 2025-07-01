'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';

import type { Observation, ObservationCategory, Company, Location, RiskLevel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/storage';
import { getAIAssistance } from '@/lib/actions/ai-actions';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const LOCATIONS = ['International', 'National', 'Local', 'Regional'] as const;
const COMPANIES = ['Tambang', 'Migas', 'Konstruksi', 'Manufaktur'] as const;

// Add 'recommendation' back to the schema as optional
const formSchema = z.object({
  location: z.enum(LOCATIONS),
  company: z.enum(COMPANIES),
  findings: z.string().min(10, { message: 'Temuan harus diisi minimal 10 karakter.' }),
  recommendation: z.string().optional(), // It's optional, user can fill it or AI will.
  photo: z
    .instanceof(File, { message: 'Foto wajib diunggah.' })
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitObservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddObservation: (observation: Omit<Observation, 'id' | 'scope' | 'projectId'>) => Promise<void>;
}

export function SubmitObservationDialog({ isOpen, onOpenChange, onAddObservation }: SubmitObservationDialogProps) {
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'analyzing' | 'uploading' | 'saving'>('idle');
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  
  const isSubmitting = submitStatus !== 'idle';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: LOCATIONS[0],
      company: COMPANIES[0],
      findings: '',
      recommendation: '', // Add recommendation to default values
    },
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            location: LOCATIONS[0],
            company: COMPANIES[0],
            findings: '',
            recommendation: '', // Reset recommendation
        });
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, [isOpen, form]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = formSchema.shape.photo.safeParse(file);
      if (validation.success) {
        form.setValue('photo', file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        form.setValue('photo', undefined, { shouldValidate: true });
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
      toast({ variant: 'destructive', title: 'Belum Terautentikasi', description: 'Anda harus login untuk mengirim.' });
      return;
    }
    
    if (!values.photo) {
       toast({ variant: 'destructive', title: 'Foto Wajib', description: 'Silakan unggah foto temuan.' });
       return;
    }

    setSubmitStatus('analyzing');

    try {
      const aiResult = await getAIAssistance({ findings: values.findings });
      
      setSubmitStatus('uploading');
      setUploadProgress(0);
      const photoUrl = await uploadFile(values.photo, 'observations', user.uid, setUploadProgress);
      
      setSubmitStatus('saving');
      const newObservationData: Omit<Observation, 'id' | 'scope' | 'projectId'> = {
        userId: user.uid,
        date: new Date().toISOString(),
        status: 'Pending',
        submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
        location: values.location as Location,
        company: values.company as Company,
        category: aiResult.suggestedCategory,
        riskLevel: aiResult.suggestedRiskLevel,
        findings: aiResult.improvedFindings,
        // Smart recommendation: Use user's input if provided, otherwise use AI's suggestion.
        recommendation: values.recommendation || aiResult.suggestedRecommendation,
        photoUrl: photoUrl,
      };

      await onAddObservation(newObservationData);

      toast({
        title: 'Sukses!',
        description: `Laporan observasi baru berhasil dikirim.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Submission failed: ", error);
      toast({
        variant: 'destructive',
        title: 'Pengiriman Gagal',
        description: error instanceof Error ? error.message : 'Tidak dapat menyimpan observasi.',
      });
    } finally {
      setSubmitStatus('idle');
      setUploadProgress(null);
    }
  };
  
  const buttonText = {
    idle: 'Kirim Laporan',
    analyzing: 'Menganalisis...',
    uploading: 'Mengunggah...',
    saving: 'Menyimpan...',
  };
  
  const renderSelectItems = (items: readonly string[]) => {
    return items.map((item) => (
      <SelectItem key={item} value={item}>
        {item}
      </SelectItem>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Submit New Observation</DialogTitle>
          <DialogDescription>
            Isi detail di bawah ini. AI akan membantu menganalisis, mengklasifikasikan, dan memberikan rekomendasi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lokasi</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pilih lokasi" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(LOCATIONS)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perusahaan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(COMPANIES)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="findings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temuan</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Jelaskan detail temuan observasi sejelas mungkin." rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Add the recommendation field back */}
              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rekomendasi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tulis rekomendasi Anda di sini, atau biarkan kosong dan AI akan membuatkannya." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo"
                render={() => (
                  <FormItem>
                    <FormLabel>Unggah Foto</FormLabel>
                    <FormControl>
                      <Input
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
                      {photoPreview ? 'Ganti Foto' : 'Pilih Foto'}
                    </Button>
                    {photoPreview && (
                      <div className="mt-2 relative w-full h-48 rounded-md overflow-hidden border">
                        <Image src={photoPreview} alt="Pratinjau Foto" fill sizes="(max-width: 525px) 100vw, 525px" className="object-cover" />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2">
          {submitStatus === 'uploading' && uploadProgress !== null && (
            <div className="w-full">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-center text-xs mt-1 text-muted-foreground">
                Mengunggah: {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" form={formId} disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText[submitStatus]}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
