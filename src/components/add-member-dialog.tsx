
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, UserPlus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Project, UserProfile } from '@/lib/types';
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
import { collection, query, where, getDocs, limit, doc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function AddMemberDialog({ isOpen, onOpenChange, project }: AddMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error' });
        return;
    }
    setIsSubmitting(true);
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", values.email.toLowerCase()), limit(1));
        const userQuerySnapshot = await getDocs(q);

        if (userQuerySnapshot.empty) {
            toast({ variant: 'destructive', title: 'User Not Found', description: `User with email ${values.email} not found.` });
            setIsSubmitting(false);
            return;
        }

        const newMember = userQuerySnapshot.docs[0].data() as UserProfile;
        const newMemberRef = doc(db, 'users', newMember.uid);
        const projectRef = doc(db, 'projects', project.id);

        await runTransaction(db, async (transaction) => {
            const projectSnap = await transaction.get(projectRef);
            if (!projectSnap.exists()) {
                throw new Error("Project does not exist.");
            }
            
            const currentProject = projectSnap.data();

            if (currentProject.ownerUid !== user.uid) {
                throw new Error("Only the project owner can add members.");
            }

            if (currentProject.memberUids?.includes(newMember.uid)) {
                throw new Error("User is already a member.");
            }
            
            // 1. Add user to project's memberUids list
            transaction.update(projectRef, {
                memberUids: arrayUnion(newMember.uid)
            });

            // 2. Add project to the new member's projectIds list
            transaction.update(newMemberRef, {
                projectIds: arrayUnion(project.id)
            });
        });

        toast({ title: 'Success!', description: `${newMember.displayName} has been added to the project.` });
        onOpenChange(false);
    } catch (error: any) {
        let description = 'An unexpected error occurred.';
        if (error.message === "User is already a member.") {
            description = `This user is already in the project.`;
        } else if (error.message === "Only the project owner can add members.") {
            description = "You do not have permission to add members.";
        }
        
        toast({
            variant: 'destructive',
            title: 'Failed to Add Member',
            description: description,
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
            <UserPlus className="h-5 w-5" />
            Add Member to "{project.name}"
          </DialogTitle>
          <DialogDescription>
            Enter the email of the user you want to add to this project. They will be added as a member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member's Email</FormLabel>
                  <FormControl>
                    <Input placeholder="member@example.com" {...field} />
                  </FormControl>
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
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
