'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import Image from 'next/image';

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
import type { Inspection, InspectionCategory, InspectionStatus } from '@/lib/types';
import { Upload } from 'lucide-react';

const formSchema = z.object({
  location: z.string().min(3, 'Location must be at least 3 characters.'),
  submittedBy: z.string().min(2, 'Submitter name is required.'),
  findings: z.string().min(10, 'Findings must be at least 10 characters.'),
  category: z.enum(['Structural', 'Electrical', 'Plumbing', 'General']),
  photo: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitInspectionDialogProps {
  children: React.ReactNode;
  onAddInspection: (inspection: Inspection) => void;
}

export function SubmitInspectionDialog({ children, onAddInspection }: SubmitInspectionDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: '',
      submittedBy: '',
      findings: '',
      category: 'General',
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

  const onSubmit = (values: FormValues) => {
    const newInspection: Inspection = {
      id: `INS-${String(Date.now()).slice(-4)}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'Pending' as InspectionStatus,
      photoUrl: values.photo ? 'https://placehold.co/600x400.png' : undefined,
      photoPreview: photoPreview || undefined,
      ...values,
      category: values.category as InspectionCategory
    };

    onAddInspection(newInspection);
    toast({
      title: 'Success!',
      description: 'New inspection has been submitted.',
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Submit New Inspection</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new inspection report.
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
                      <FormControl>
                        <Input placeholder="e.g., Main Boiler Room" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="submittedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submitted By</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an inspection category" />
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
                name="findings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Findings</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the inspection findings in detail."
                        className="resize-none"
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
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" form={formId}>Submit Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
