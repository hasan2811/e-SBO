'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Observation, ObservationCategory, ObservationStatus, Company, Location, RiskLevel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { getSecureUploadUrl } from '@/lib/actions';

const formSchema = z.object({
  location: z.enum(['Location A', 'Location B', 'Location C', 'Location D']),
  findings: z.string().min(10, 'Findings must be at least 10 characters.'),
  recommendation: z.string().min(10, 'Recommendation must be at least 10 characters.'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
  category: z.enum(['Structural', 'Electrical', 'Plumbing', 'General']),
  company: z.enum(['Perusahaan A', 'Perusahaan B', 'Perusahaan C', 'Perusahaan D']),
  photo: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitObservationDialogProps {
  children: React.ReactNode;
  onAddObservation: (observation: Observation) => Promise<void>;
}

async function uploadFile(file: File): Promise<{ url: string }> {
  try {
    const filePath = `observations/${Date.now()}-${file.name}`;
    const { signedUrl, publicUrl } = await getSecureUploadUrl(filePath, file.type);

    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
    }

    return { url: publicUrl };
  } catch (error) {
    console.error('File upload process failed:', error);
    throw new Error('Could not upload file.');
  }
}

export function SubmitObservationDialog({ children, onAddObservation }: SubmitObservationDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: 'Location A',
      findings: '',
      recommendation: '',
      riskLevel: 'Low',
      category: 'General',
      company: 'Perusahaan A',
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setPhotoPreview(null);
    }
    setIsOpen(open);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if(file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 4MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        form.setValue('photo', file);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to submit an observation.' });
        return;
    }
    setIsSubmitting(true);
    let photoUrl: string | undefined = undefined;

    try {
        if (values.photo) {
            const file = values.photo as File;
            const result = await uploadFile(file);
            photoUrl = result.url;
        }

        const newObservation: Observation = {
            id: `OBS-${String(Date.now()).slice(-6)}`,
            date: new Date().toISOString(),
            status: 'Pending' as ObservationStatus,
            photoUrl: photoUrl,
            submittedBy: user.displayName || 'Anonymous User',
            location: values.location as Location,
            findings: values.findings,
            recommendation: values.recommendation,
            riskLevel: values.riskLevel as RiskLevel,
            category: values.category as ObservationCategory,
            company: values.company as Company,
        };
        
        await onAddObservation(newObservation);

        toast({
            title: 'Success!',
            description: 'New observation has been submitted.',
        });
        setIsOpen(false);

    } catch (error) {
        console.error("Submission failed: ", error);
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: 'Could not save the observation. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Submit New Observation</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new observation report.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Location A">Location A</SelectItem>
                            <SelectItem value="Location B">Location B</SelectItem>
                            <SelectItem value="Location C">Location C</SelectItem>
                            <SelectItem value="Location D">Location D</SelectItem>
                          </SelectContent>
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
                        <FormLabel>Company</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Perusahaan A">Perusahaan A</SelectItem>
                            <SelectItem value="Perusahaan B">Perusahaan B</SelectItem>
                            <SelectItem value="Perusahaan C">Perusahaan C</SelectItem>
                            <SelectItem value="Perusahaan D">Perusahaan D</SelectItem>
                          </SelectContent>
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
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Structural">Structural</SelectItem>
                            <SelectItem value="Electrical">Electrical</SelectItem>
                            <SelectItem value="Plumbing">Plumbing</SelectItem>
                            <SelectItem value="General">General</SelectItem>
                          </SelectContent>
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
                        <FormLabel>Level of Risk</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a risk level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
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
                    <FormLabel>Findings</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the observation findings in detail."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
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
                    <FormLabel>Recommendation Action</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the recommended actions."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Photo</FormLabel>
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
                        <Image src={photoPreview} alt="Photo preview" fill className="object-cover" data-ai-hint="leaking pipe" />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
