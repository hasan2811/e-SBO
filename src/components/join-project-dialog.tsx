'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, LogIn } from 'lucide-react';
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
import { doc, runTransaction, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  projectId: z.string().trim().min(1, { message: 'Project ID tidak boleh kosong.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface JoinProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinProjectDialog({ isOpen, onOpenChange }: JoinProjectDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = React.useState(false);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: '',
    },
  });

  const onJoin = async (values: FormValues) => {
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }

    const projectId = values.projectId.trim();

    if (userProfile.projectIds?.includes(projectId)) {
      toast({ variant: 'default', title: 'Sudah menjadi anggota', description: 'Anda sudah menjadi anggota proyek ini.' });
      return;
    }

    setIsJoining(true);
    try {
      const projectRef = doc(db, 'projects', projectId);
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const projectSnap = await transaction.get(projectRef);
        if (!projectSnap.exists()) {
          throw new Error('Project not found');
        }

        // Add user to project's member list
        transaction.update(projectRef, {
          memberUids: arrayUnion(user.uid),
        });
        // Add project to user's project list
        transaction.update(userRef, {
          projectIds: arrayUnion(projectId),
        });
      });
      
      toast({ title: 'Sukses!', description: `Berhasil bergabung dengan proyek!` });
      onOpenChange(false);
    } catch (error: any) {
      let description = 'Terjadi kesalahan tak terduga.';
      if (error.message === 'Project not found') {
        description = 'Proyek dengan ID tersebut tidak ditemukan. Periksa kembali ID yang Anda masukkan.';
      }
      toast({ variant: 'destructive', title: 'Gagal Bergabung dengan Proyek', description });
    } finally {
      setIsJoining(false);
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
            <LogIn className="h-5 w-5" />
            Gabung dengan Proyek
          </DialogTitle>
          <DialogDescription>
            Masukkan ID Proyek yang diberikan oleh pemilik proyek untuk bergabung.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onJoin)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: a1b2c3d4e5f6g7h8i9j0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isJoining}>
            Batal
          </Button>
          <Button type="submit" form={formId} disabled={isJoining || !form.formState.isValid}>
            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gabung
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
