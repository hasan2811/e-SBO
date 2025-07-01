
'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, Sparkles } from 'lucide-react';

import type { Observation, ObservationCategory, ObservationStatus, Company, Location, RiskLevel, Scope } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/storage';
import { getAIAssistance } from '@/lib/actions/ai-actions';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';


const LOCATIONS = ['International', 'National', 'Local', 'Regional'] as const;
const COMPANIES = ['Tambang', 'Migas', 'Konstruksi', 'Manufaktur'] as const;
const CATEGORIES = ['Structural', 'Electrical', 'Plumbing', 'General'] as const;
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;

const formSchema = z.object({
  location: z.enum(LOCATIONS),
  company: z.enum(COMPANIES),
  category: z.enum(CATEGORIES),
  riskLevel: z.enum(RISK_LEVELS),
  findings: z.string().min(10, { message: 'Temuan harus diisi minimal 10 karakter.' }),
  recommendation: z.string().min(10, { message: 'Rekomendasi harus diisi minimal 10 karakter.' }),
  photo: z
    .instanceof(File, { message: 'Foto wajib diunggah.' })
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
  isPublic: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitObservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddObservation: (observation: Omit<Observation, 'id'>) => Promise<void>;
}

export function SubmitObservationDialog({ isOpen, onOpenChange, onAddObservation }: SubmitObservationDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: LOCATIONS[0],
      company: COMPANIES[0],
      category: 'General',
      riskLevel: 'Low',
      findings: '',
      recommendation: '',
      isPublic: false,
    },
    mode: 'onChange',
  });

  const findingsValue = useWatch({ control: form.control, name: 'findings' });
  const showAiButton = findingsValue && findingsValue.length >= 20;

  const handleAiAssist = async () => {
    const findings = form.getValues('findings');
    if (findings.length < 20) {
      toast({
        variant: 'destructive',
        title: 'Teks Kurang',
        description: 'Mohon tulis temuan minimal 20 karakter untuk bantuan AI.',
      });
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await getAIAssistance({ findings });
      form.setValue('category', result.suggestedCategory, { shouldValidate: true });
      form.setValue('riskLevel', result.suggestedRiskLevel, { shouldValidate: true });
      form.setValue('findings', result.improvedFindings, { shouldValidate: true });
      form.setValue('recommendation', result.suggestedRecommendation, { shouldValidate: true });
      toast({
        title: 'Bantuan AI Diterapkan!',
        description: 'Formulir telah diperbarui dengan saran dari AI.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Bantuan AI Gagal',
        description: 'Tidak dapat memproses permintaan Anda saat ini.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

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

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const photoUrl = await uploadFile(values.photo, 'observations', user.uid, setUploadProgress);
      
      const scope: Scope = values.isPublic ? 'public' : 'private';
      const projectId: string | null = null;

      const newObservationData: Omit<Observation, 'id'> = {
        userId: user.uid,
        date: new Date().toISOString(),
        status: 'Pending' as ObservationStatus,
        submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
        location: values.location as Location,
        company: values.company as Company,
        category: values.category as ObservationCategory,
        riskLevel: values.riskLevel as RiskLevel,
        findings: values.findings,
        recommendation: values.recommendation,
        photoUrl: photoUrl,
        scope,
        projectId,
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
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
      setPhotoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, form]);
  
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
            Isi detail di bawah ini untuk menambahkan laporan observasi baru.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(CATEGORIES)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="riskLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tingkat Risiko</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pilih tingkat risiko" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(RISK_LEVELS)}</SelectContent>
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
                    <div className="flex justify-between items-center">
                      <FormLabel>Temuan</FormLabel>
                      {showAiButton && (
                        <Button type="button" variant="outline" size="sm" onClick={handleAiAssist} disabled={isAiLoading}>
                          {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Bantuan AI
                        </Button>
                      )}
                    </div>
                    <FormControl>
                      <Textarea placeholder="Jelaskan detail temuan observasi." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tindakan Rekomendasi</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Jelaskan tindakan yang direkomendasikan." rows={3} {...field} />
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
                        Jika aktif, laporan ini dapat dilihat oleh semua pengguna.
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
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...</>
              ) : (
                'Kirim Laporan'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
