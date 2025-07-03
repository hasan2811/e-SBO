
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
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Nama proyek minimal harus 3 karakter.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ isOpen, onOpenChange }: CreateProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = React.useState(false);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onCreate = async (values: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Anda harus login untuk membuat proyek.' });
      return;
    }

    setIsCreating(true);
    try {
      const projectsCollection = collection(db, 'projects');
      const newProjectRef = await addDoc(projectsCollection, {
        name: values.name,
        ownerUid: user.uid,
        memberUids: [user.uid], // Owner is automatically a member
        createdAt: new Date().toISOString(),
      });
      
      // Also add the project ID to the user's profile
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
          projectIds: arrayUnion(newProjectRef.id)
      });
      
      toast({ title: 'Sukses!', description: `Proyek "${values.name}" berhasil dibuat.` });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast({ variant: 'destructive', title: 'Gagal Membuat Proyek', description: 'Terjadi kesalahan tak terduga.' });
    } finally {
      setIsCreating(false);
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
            <FolderPlus className="h-5 w-5" />
            Buat Proyek Baru
          </DialogTitle>
          <DialogDescription>
            Masukkan nama untuk proyek baru Anda. Anda akan otomatis menjadi pemilik dan anggota proyek.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onCreate)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Proyek</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Proyek Konstruksi Jembatan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Batal
          </Button>
          <Button type="submit" form={formId} disabled={isCreating || !form.formState.isValid}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Proyek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
