
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, FolderPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
import { collection, doc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { CustomListInput } from './custom-list-input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { useProjects } from '@/hooks/use-projects';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ isOpen, onOpenChange }: CreateProjectDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { addProject } = useProjects();
  const [isCreating, setIsCreating] = React.useState(false);
  const formId = React.useId();

  const [customCompanies, setCustomCompanies] = React.useState<string[]>([]);
  const [customLocations, setCustomLocations] = React.useState<string[]>([]);
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onCreate = async (values: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to create a project.' });
      return;
    }

    setIsCreating(true);
    
    const projectsCollection = collection(db, 'projects');
    const newProjectRef = doc(projectsCollection);
    
    const newProjectData = {
      id: newProjectRef.id,
      name: values.name,
      ownerUid: user.uid,
      memberUids: [user.uid],
      createdAt: new Date().toISOString(),
      isOpen: true,
      customCompanies: customCompanies,
      customLocations: customLocations,
      customObservationCategories: customCategories,
      roles: {},
    };
    
    try {
      await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', user.uid);
        // READ FIRST for transaction safety
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User profile does not exist. Cannot create project.");
        }
        
        // 1. Set the new project document
        transaction.set(newProjectRef, newProjectData);
        
        // 2. Update the user's project list
        transaction.update(userDocRef, {
            projectIds: arrayUnion(newProjectRef.id)
        });
      });
      
      // Manually add project to local state for immediate UI update before redirecting
      addProject(newProjectData);

      toast({ title: 'Success!', description: `Project "${values.name}" was created successfully.` });
      onOpenChange(false);
      router.push(`/proyek/${newProjectRef.id}/observasi`);
    } catch (error) {
      console.error("Failed to create project:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while saving the project.';
      toast({ variant: 'destructive', title: 'Failed to Create Project', description: errorMessage });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setCustomCompanies([]);
      setCustomLocations([]);
      setCustomCategories([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Fill in the project details and configure custom form options.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
            <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onCreate)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription>The project name is required. This name will be visible to all project members.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Project Name *</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Bridge Construction Project" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Form Customization (Optional)</CardTitle>
                        <CardDescription>Add custom dropdown options that will be used in observation forms for this project.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <CustomListInput
                            inputId="custom-categories-create"
                            title="Custom Observation Categories"
                            description="If empty, the default list will be used."
                            placeholder="e.g., Procedure Violation"
                            items={customCategories}
                            setItems={setCustomCategories}
                        />
                        <CustomListInput
                            inputId="custom-companies-create"
                            title="Custom Companies"
                            description="If empty, the application's default list will be used."
                            placeholder="e.g., PT. Subcontractor"
                            items={customCompanies}
                            setItems={setCustomCompanies}
                        />
                        <CustomListInput
                            inputId="custom-locations-create"
                            title="Custom Locations"
                            description="If empty, the application's default list will be used."
                            placeholder="e.g., Fabrication Area"
                            items={customLocations}
                            setItems={setCustomLocations}
                        />
                    </CardContent>
                </Card>
            </form>
            </Form>
        </div>
        <DialogFooter className="pt-4 border-t flex-shrink-0">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isCreating || !form.formState.isValid}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
