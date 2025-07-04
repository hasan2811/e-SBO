
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, Wrench, Sparkles, Wand2 } from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { triggerInspectionAnalysis } from '@/lib/actions/item-actions';
import { useDebounce } from 'use-debounce';
import { assistInspection } from '@/ai/flows/assist-inspection-flow';

import type { Inspection, InspectionStatus, EquipmentType, Location, Project, Scope, AssistInspectionOutput } from '@/lib/types';
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
import { DEFAULT_LOCATIONS, EQUIPMENT_TYPES, INSPECTION_STATUSES } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const formSchema = z.object({
  location: z.string().min(1),
  equipmentName: z.string().min(3, { message: 'Nama peralatan minimal 3 karakter.' }),
  equipmentType: z.enum(EQUIPMENT_TYPES),
  status: z.enum(INSPECTION_STATUSES),
  findings: z.string().min(10, { message: 'Temuan harus diisi minimal 10 karakter.' }),
  recommendation: z.string().optional(),
  photo: z
    .instanceof(File, { message: 'Foto wajib diunggah.' })
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitInspectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function SubmitInspectionDialog({ isOpen, onOpenChange, project }: SubmitInspectionDialogProps) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // AI Assistant State
  const [aiSuggestions, setAiSuggestions] = React.useState<AssistInspectionOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentName: '',
      equipmentType: EQUIPMENT_TYPES[0],
      status: INSPECTION_STATUSES[0],
      findings: '',
      recommendation: '',
    },
    mode: 'onChange',
  });
  
  const [debouncedFindings] = useDebounce(form.watch('findings'), 1000);
  
  React.useEffect(() => {
    async function getAiSuggestions() {
      if (!userProfile || !(userProfile.aiEnabled ?? true)) {
        setAiSuggestions(null);
        return;
      }
      if (debouncedFindings && debouncedFindings.length > 20) {
        setIsAiLoading(true);
        try {
          const suggestions = await assistInspection({ findings: debouncedFindings }, userProfile);
          setAiSuggestions(suggestions);
        } catch (error) {
          console.error('AI suggestion failed:', error);
          setAiSuggestions(null); // Clear suggestions on error
        } finally {
          setIsAiLoading(false);
        }
      } else {
        setAiSuggestions(null);
      }
    }
    getAiSuggestions();
  }, [debouncedFindings, userProfile]);
  
  const locationOptions = React.useMemo(() => 
    (project?.customLocations && project.customLocations.length > 0) ? project.customLocations : DEFAULT_LOCATIONS,
  [project]);

  const resetForm = React.useCallback(() => {
    form.reset({
        location: locationOptions[0],
        equipmentName: '',
        equipmentType: EQUIPMENT_TYPES[0],
        status: INSPECTION_STATUSES[0],
        findings: '',
        recommendation: '',
    });
    setPhotoPreview(null);
    setAiSuggestions(null);
    setIsAiLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [form, locationOptions]);

  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

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
        toast({ variant: 'destructive', title: 'File tidak valid', description: validation.error.issues[0].message });
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user || !userProfile || !values.photo) return;
    setIsSubmitting(true);
    
    try {
        const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
        const projectId = match ? match[1] : null;

        const photoUrl = await uploadFile(values.photo, 'inspections', userProfile.uid, () => {}, projectId);
        
        const scope: Scope = projectId ? 'project' : 'private';
        const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const newInspectionData: Omit<Inspection, 'id'> = {
            itemType: 'inspection',
            userId: userProfile.uid,
            date: new Date().toISOString(),
            submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
            location: values.location as Location,
            equipmentName: values.equipmentName,
            equipmentType: values.equipmentType,
            status: values.status,
            findings: values.findings,
            recommendation: values.recommendation,
            photoUrl: photoUrl,
            scope,
            projectId,
            referenceId,
            aiStatus: 'processing',
        };

        const docRef = await addDoc(collection(db, "inspections"), newInspectionData);
        const newInspection = { ...newInspectionData, id: docRef.id };
        
        // No longer call addItem here. The onSnapshot listener will handle it.

        if (userProfile.aiEnabled ?? true) {
            triggerInspectionAnalysis(newInspection).catch(error => {
                console.error("Failed to trigger AI analysis for inspection:", error);
            });
        } else {
            const inspectionDocRef = doc(db, 'inspections', newInspection.id);
            await updateDoc(inspectionDocRef, { aiStatus: 'n/a' });
        }

        toast({ title: 'Laporan Terkirim', description: `Laporan inspeksi Anda telah berhasil disimpan.` });
        onOpenChange(false);
    } catch (error) {
        console.error("Submission failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const renderSelectItems = (items: readonly string[]) => items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Submit New Inspection</DialogTitle>
          <DialogDescription>Isi detail di bawah untuk menambahkan laporan inspeksi baru.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField name="equipmentName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Nama Peralatan</FormLabel><FormControl><Input placeholder="e.g., Excavator EX-01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="location" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Lokasi</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{renderSelectItems(locationOptions)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="equipmentType" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Jenis Peralatan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{renderSelectItems(EQUIPMENT_TYPES)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField name="status" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Status Inspeksi</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{renderSelectItems(INSPECTION_STATUSES)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField name="findings" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Temuan</FormLabel><FormControl><Textarea placeholder="Jelaskan detail temuan inspeksi." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              {/* AI Assistant Section */}
              <div className="relative">
                {isAiLoading && (
                  <div className="absolute top-2 right-2 z-10">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {aiSuggestions && (
                   <Alert className="bg-primary/5 border-primary/20 text-primary-foreground mt-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-semibold">Saran Asisten AI</AlertTitle>
                    <AlertDescription className="text-primary/90 space-y-3 mt-2">
                       {aiSuggestions.suggestedStatus && (
                         <div className="flex items-center justify-between">
                           <p>Saran Status: <span className="font-semibold">{aiSuggestions.suggestedStatus}</span></p>
                           <Button type="button" size="sm" variant="outline" onClick={() => form.setValue('status', aiSuggestions.suggestedStatus as InspectionStatus)}>Terapkan</Button>
                         </div>
                       )}
                       {aiSuggestions.improvedFindings && (
                         <div>
                            <p className="mb-1">Saran Perbaikan Temuan:</p>
                            <p className="p-2 bg-background/50 rounded text-sm">{aiSuggestions.improvedFindings}</p>
                            <Button type="button" size="sm" variant="outline" className="mt-1" onClick={() => form.setValue('findings', aiSuggestions.improvedFindings)}>Terapkan</Button>
                         </div>
                       )}
                        {aiSuggestions.suggestedRecommendation && (
                         <div>
                            <p className="mb-1">Saran Rekomendasi:</p>
                             <Button type="button" size="sm" variant="outline" className="w-full justify-start text-left h-auto whitespace-normal" onClick={() => form.setValue('recommendation', aiSuggestions.suggestedRecommendation)}>
                                <Wand2 className="mr-2 h-4 w-4 flex-shrink-0" /> {aiSuggestions.suggestedRecommendation}
                             </Button>
                         </div>
                       )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <FormField name="recommendation" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Rekomendasi (Opsional)</FormLabel><FormControl><Textarea placeholder="Jelaskan tindakan yang direkomendasikan." rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="photo" control={form.control} render={() => (
                <FormItem><FormLabel>Unggah Foto</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoChange} />
                  </FormControl>
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />{photoPreview ? 'Ganti Foto' : 'Pilih Foto'}
                  </Button>
                  {photoPreview && <div className="mt-2 relative w-full h-48 rounded-md overflow-hidden border"><Image src={photoPreview} alt="Pratinjau" fill sizes="100vw" className="object-cover" /></div>}
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
              Kirim Laporan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
