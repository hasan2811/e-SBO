
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, Sparkles, Wand2 } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { format } from 'date-fns';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import type { Project, AssistObservationOutput, Scope, Location, Company, RiskLevel, ObservationCategory, Observation } from '@/lib/types';
import { OBSERVATION_CATEGORIES, RISK_LEVELS } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getAIAssistance } from '@/lib/actions/ai-actions';
import { uploadFile } from '@/lib/storage';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';


const DEFAULT_LOCATIONS = ['International', 'National', 'Local', 'Regional'] as const;
const DEFAULT_COMPANIES = ['Tambang', 'Migas', 'Konstruksi', 'Manufaktur'] as const;

const formSchema = z.object({
  photo: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`)
    .optional(),
  location: z.string({ required_error: "Location is required." }).min(1, "Location is required."),
  company: z.string({ required_error: "Company is required." }).min(1, "Company is required."),
  findings: z.string().min(10, { message: 'Temuan harus diisi minimal 10 karakter.' }),
  recommendation: z.string().optional(),
  category: z.enum(OBSERVATION_CATEGORIES),
  riskLevel: z.enum(RISK_LEVELS),
});

type FormValues = z.infer<typeof formSchema>;

const AiSuggestion = ({
  title,
  suggestion,
  onApply,
  isLoading,
}: {
  title: string;
  suggestion: string | undefined | null;
  onApply: () => void;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Menganalisis...</span>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="text-xs bg-primary/10 p-2 rounded-md border-l-2 border-primary"
    >
      <p className="font-semibold text-primary mb-1">{title}</p>
      <div className="flex justify-between items-start gap-2">
        <p className="flex-1 text-muted-foreground italic">"{suggestion}"</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-auto px-2 py-1 text-primary hover:bg-primary/20"
          onClick={onApply}
        >
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          Terapkan
        </Button>
      </div>
    </motion.div>
  );
};


interface SubmitObservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function SubmitObservationDialog({ isOpen, onOpenChange, project }: SubmitObservationDialogProps) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [aiSuggestions, setAiSuggestions] = React.useState<AssistObservationOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = React.useState(false);

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
      category: 'Supervision',
      riskLevel: 'Low',
    },
    mode: 'onChange',
  });
  
  const findingsValue = form.watch('findings');
  const [debouncedFindings] = useDebounce(findingsValue, 1000);

  React.useEffect(() => {
    const fetchAiSuggestions = async () => {
      if (debouncedFindings && debouncedFindings.length >= 20) {
        setIsAiLoading(true);
        try {
          const result = await getAIAssistance({ findings: debouncedFindings });
          setAiSuggestions(result);
        } catch (error) {
          console.error("AI assistance failed", error);
          setAiSuggestions(null);
        } finally {
          setIsAiLoading(false);
        }
      } else {
        setAiSuggestions(null);
      }
    };
    fetchAiSuggestions();
  }, [debouncedFindings]);


  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            photo: undefined,
            location: locationOptions[0],
            company: companyOptions[0],
            findings: '',
            recommendation: '',
            category: 'Supervision',
            riskLevel: 'Low',
        });
        setPhotoPreview(null);
        setAiSuggestions(null);
        setIsAiLoading(false);
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
        
        let photoUrl: string;
        if (values.photo) {
          photoUrl = await uploadFile(values.photo, 'observations', userProfile.uid, () => {}, projectId);
        } else {
          photoUrl = 'https://placehold.co/600x400.png';
        }

        const scope: Scope = projectId ? 'project' : 'private';
        const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const newObservationData: Omit<Observation, 'id'> = {
            itemType: 'observation',
            userId: userProfile.uid,
            date: new Date().toISOString(),
            status: 'Pending',
            submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
            location: values.location as Location,
            company: values.company as Company,
            category: values.category as ObservationCategory,
            riskLevel: values.riskLevel as RiskLevel,
            findings: values.findings,
            recommendation: values.recommendation || '',
            photoUrl: photoUrl,
            referenceId,
            scope,
            projectId,
            aiStatus: 'processing', // AI analysis will be triggered separately now.
            likes: [],
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
        };

        await addDoc(collection(db, 'observations'), newObservationData);

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
            Isi detail di bawah ini. AI akan membantu menganalisis dan memberi saran secara *real-time*.
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Textarea placeholder="Jelaskan detail temuan observasi sejelas mungkin." rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                     <AnimatePresence>
                      <AiSuggestion
                        title="Saran Perbaikan Kalimat"
                        suggestion={aiSuggestions?.improvedFindings}
                        isLoading={isAiLoading && !aiSuggestions}
                        onApply={() => form.setValue('findings', aiSuggestions!.improvedFindings, { shouldValidate: true })}
                      />
                    </AnimatePresence>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori (LSR)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{renderSelectItems(OBSERVATION_CATEGORIES as any)}</SelectContent>
                      </Select>
                      <FormMessage />
                       <AnimatePresence>
                         <AiSuggestion
                            title="Saran Kategori"
                            suggestion={aiSuggestions?.suggestedCategory}
                            isLoading={isAiLoading && !aiSuggestions}
                            onApply={() => form.setValue('category', aiSuggestions!.suggestedCategory as any, { shouldValidate: true })}
                          />
                       </AnimatePresence>
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
                         <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{renderSelectItems(RISK_LEVELS)}</SelectContent>
                      </Select>
                      <FormMessage />
                       <AnimatePresence>
                        <AiSuggestion
                          title="Saran Tingkat Risiko"
                          suggestion={aiSuggestions?.suggestedRiskLevel}
                          isLoading={isAiLoading && !aiSuggestions}
                          onApply={() => form.setValue('riskLevel', aiSuggestions!.suggestedRiskLevel as any, { shouldValidate: true })}
                        />
                      </AnimatePresence>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rekomendasi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tulis rekomendasi Anda di sini, atau biarkan AI yang membuatkannya." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                    <AnimatePresence>
                      <AiSuggestion
                        title="Saran Rekomendasi"
                        suggestion={aiSuggestions?.suggestedRecommendation}
                        isLoading={isAiLoading && !aiSuggestions}
                        onApply={() => form.setValue('recommendation', aiSuggestions!.suggestedRecommendation, { shouldValidate: true })}
                      />
                    </AnimatePresence>
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
