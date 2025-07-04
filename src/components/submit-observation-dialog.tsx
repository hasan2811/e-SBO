
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { useObservations } from '@/hooks/use-observations';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

import type { Project, Scope, Location, Company, Observation } from '@/lib/types';
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

const DEFAULT_LOCATIONS = ['International', 'National', 'Local', 'Regional'] as const;
const DEFAULT_COMPANIES = ['Tambang', 'Migas', 'Konstruksi', 'Manufaktur'] as const;

// Schema is now simplified. Category and Risk Level are handled by AI post-submission.
const formSchema = z.object({
  photo: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`)
    .optional(),
  location: z.string({ required_error: "Location is required." }).min(1, "Location is required."),
  company: z.string({ required_error: "Company is required." }).min(1, "Company is required."),
  findings: z.string().min(10, { message: 'Temuan harus diisi minimal 10 karakter.' }),
  recommendation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitObservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function SubmitObservationDialog({ isOpen, onOpenChange, project }: SubmitObservationDialogProps) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { addItem } = useObservations();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const companyOptions = React.useMemo(() => 
    (project?.customCompanies && project.customCompanies.length > 0) ? project.customCompanies : DEFAULT_COMPANIES,
  [project]);

  const locationOptions = React.useMemo(() => 
    (project?.customLocations && project.customLocations.length > 0) ? project.customLocations : DEFAULT_LOCATIONS,
  [project]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      photo: undefined,
      findings: '',
      recommendation: '',
    },
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            photo: undefined,
            location: locationOptions[0],
            company: companyOptions[0],
            findings: '',
            recommendation: '',
        });
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, [isOpen, form, locationOptions, companyOptions]);

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
      toast({ variant: 'destructive', title: 'Belum Terautentikasi' });
      return;
    }
    setIsSubmitting(true);
    try {
        const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
        const projectId = match ? match[1] : null;
        
        let photoUrl: string | undefined;
        if (values.photo) {
          photoUrl = await uploadFile(values.photo, 'observations', userProfile.uid, () => {}, projectId);
        }

        const scope: Scope = projectId ? 'project' : 'private';
        const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const newObservationData: Omit<Observation, 'id'> = {
            itemType: 'observation',
            userId: userProfile.uid,
            date: new Date().toISOString(),
            submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
            location: values.location as Location,
            company: values.company as Company,
            findings: values.findings,
            recommendation: values.recommendation || '',
            photoUrl: photoUrl,
            scope,
            projectId,
            referenceId,
            category: 'Supervision', // Default category
            riskLevel: 'Low', // Default risk level
            status: 'Pending',
            aiStatus: 'n/a', // AI processing is disabled for now to ensure stability
            likes: [], likeCount: 0, commentCount: 0, viewCount: 0,
        };
        
        const docRef = await addDoc(collection(db, "observations"), newObservationData);
        
        const finalObservation = { ...newObservationData, id: docRef.id };
        addItem(finalObservation);

        toast({ title: 'Laporan Terkirim', description: 'Observasi Anda telah berhasil disimpan.' });
        onOpenChange(false);
    } catch (error) {
        console.error("Submission failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
    } finally {
        setIsSubmitting(false);
    }
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
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
             Submit New Observation
          </DialogTitle>
          <DialogDescription>
            Cukup isi temuan Anda. AI akan membantu menganalisis kategori dan risiko nanti.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField
                control={form.control}
                name="photo"
                render={() => (
                  <FormItem>
                    <FormLabel>Unggah Foto (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lokasi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pilih lokasi" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(locationOptions)}</SelectContent>
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(companyOptions)}</SelectContent>
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
                      <Textarea placeholder="Jelaskan detail temuan observasi sejelas mungkin." rows={5} {...field} disabled={isSubmitting} />
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
                    <FormLabel>Rekomendasi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tulis rekomendasi Anda di sini." rows={3} {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2">
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" form={formId} disabled={!form.formState.isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Laporan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
