
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, Wrench } from 'lucide-react';

import { uploadFile } from '@/lib/storage';
import type { Inspection, InspectionStatus, EquipmentType, Location } from '@/lib/types';
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
const EQUIPMENT_TYPES = ['Heavy Machinery', 'Hand Tool', 'Vehicle', 'Electrical', 'Other'] as const;
const INSPECTION_STATUSES = ['Pass', 'Fail', 'Needs Repair'] as const;

const formSchema = z.object({
  location: z.enum(LOCATIONS),
  equipmentName: z.string().min(3, { message: 'Nama peralatan minimal 3 karakter.' }),
  equipmentType: z.enum(EQUIPMENT_TYPES),
  status: z.enum(INSPECTION_STATUSES),
  findings: z.string().min(10, { message: 'Temuan harus diisi minimal 10 karakter.' }),
  recommendation: z.string().optional(),
  photo: z
    .instanceof(File, { message: 'Foto wajib diunggah.' })
    .refine((file) => file.size <= 10 * 1024 * 1024, `Ukuran file maksimal adalah 10MB.`),
  isPrivate: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitInspectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddInspection: (inspection: Omit<Inspection, 'id'>) => Promise<void>;
}

export function SubmitInspectionDialog({ isOpen, onOpenChange, onAddInspection }: SubmitInspectionDialogProps) {
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
      location: LOCATIONS[0],
      equipmentName: '',
      equipmentType: EQUIPMENT_TYPES[0],
      status: INSPECTION_STATUSES[0],
      findings: '',
      recommendation: '',
      isPrivate: false,
    },
    mode: 'onChange',
  });

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
    if (!user || !userProfile) return;
    if (!values.photo) {
      toast({ variant: 'destructive', title: 'Foto Wajib', description: 'Silakan unggah foto temuan.' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const photoUrl = await uploadFile(values.photo, 'inspections', user.uid, setUploadProgress);
      const newInspectionData: Omit<Inspection, 'id'> = {
        userId: user.uid,
        date: new Date().toISOString(),
        submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
        location: values.location as Location,
        equipmentName: values.equipmentName,
        equipmentType: values.equipmentType as EquipmentType,
        status: values.status as InspectionStatus,
        findings: values.findings,
        recommendation: values.recommendation,
        photoUrl: photoUrl,
        scope: values.isPrivate ? 'private' : 'public',
      };

      await onAddInspection(newInspectionData);
      toast({ title: 'Sukses!', description: `Laporan inspeksi baru berhasil dikirim ke ${values.isPrivate ? 'Beranda' : 'Jurnal'}.` });
      onOpenChange(false);
    } catch (error) {
      console.error("Submission failed: ", error);
      toast({ variant: 'destructive', title: 'Pengiriman Gagal', description: error instanceof Error ? error.message : 'Tidak dapat menyimpan laporan.' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen, form]);

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
                  <FormItem><FormLabel>Lokasi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{renderSelectItems(LOCATIONS)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="equipmentType" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Jenis Peralatan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{renderSelectItems(EQUIPMENT_TYPES)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField name="status" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Status Inspeksi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{renderSelectItems(INSPECTION_STATUSES)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField name="findings" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Temuan</FormLabel><FormControl><Textarea placeholder="Jelaskan detail temuan inspeksi." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="recommendation" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Rekomendasi (Opsional)</FormLabel><FormControl><Textarea placeholder="Jelaskan tindakan yang direkomendasikan." rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="photo" control={form.control} render={() => (
                <FormItem><FormLabel>Unggah Foto</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoChange} disabled={isSubmitting} />
                  </FormControl>
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                    <Upload className="mr-2 h-4 w-4" />{photoPreview ? 'Ganti Foto' : 'Pilih Foto'}
                  </Button>
                  {photoPreview && <div className="mt-2 relative w-full h-48 rounded-md overflow-hidden border"><Image src={photoPreview} alt="Pratinjau" fill sizes="100vw" className="object-cover" /></div>}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                  control={form.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
                      <div className="space-y-0.5">
                        <FormLabel>Simpan ke Beranda (Pribadi)</FormLabel>
                        <FormDescription>
                          Jika aktif, laporan ini hanya akan terlihat oleh Anda.
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
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...</> : 'Kirim Laporan'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
