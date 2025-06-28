'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  position: z.string().min(3, { message: 'Position must be at least 3 characters long.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface CompleteProfileDialogProps {
  isOpen: boolean;
  onProfileComplete: () => void;
}

export function CompleteProfileDialog({ isOpen, onProfileComplete }: CompleteProfileDialogProps) {
  const { user, userProfile, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user || !userProfile) return;
    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { position: values.position });
      toast({
        title: 'Profile Completed!',
        description: 'You can now start submitting observations.',
      });
      onProfileComplete();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your position. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} modal={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to HSSE Tech!</DialogTitle>
          <DialogDescription>
            Please complete your profile by adding your position. This will be displayed on all your observation reports.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position / Jabatan</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Safety Officer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form={formId} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
