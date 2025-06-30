
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle } from 'lucide-react';
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters.' }),
  memberEmails: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProject: (projectName: string, memberEmails: string) => Promise<void>;
}

export function ProjectDialog({ isOpen, onOpenChange, onAddProject }: ProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      memberEmails: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await onAddProject(values.name, values.memberEmails || '');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create the project. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Give your new project a name and invite members to start collaborating.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Q1 Safety Audit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberEmails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invite Members (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter member emails, separated by commas..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Add users to this project by their email address.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
