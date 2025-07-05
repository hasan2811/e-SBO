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
import { useRouter } from 'next/navigation';
import { CustomListInput } from './custom-list-input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

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
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = React.useState(false);
  const formId = React.useId();

  const [customCompanies, setCustomCompanies] = React.useState<string[]>([]);
  const [customLocations, setCustomLocations] = React.useState<string[]>([]);

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
        memberUids: [user.uid],
        createdAt: new Date().toISOString(),
        isOpen: true,
        customCompanies: customCompanies,
        customLocations: customLocations,
      });
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
          projectIds: arrayUnion(newProjectRef.id)
      });
      
      toast({ title: 'Sukses!', description: `Proyek "${values.name}" berhasil dibuat.` });
      onOpenChange(false);
      router.push(`/proyek/${newProjectRef.id}/observasi`);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast({ variant: 'destructive', title: 'Gagal Membuat Proyek', description: 'Terjadi kesalahan tak terduga.' });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setCustomCompanies([]);
      setCustomLocations([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Buat Proyek Baru
          </DialogTitle>
          <DialogDescription>
            Masukkan nama proyek dan (opsional) konfigurasikan opsi formulir khusus untuk perusahaan dan lokasi.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="pr-6 -mr-6">
            <div className="space-y-6">
                <Form {...form}>
                <form id={formId} onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nama Proyek *</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Proyek Konstruksi Jembatan" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </form>
                </Form>
                
                <Separator/>
                
                <div className="space-y-4">
                    <CustomListInput
                        title="Perusahaan Kustom (Opsional)"
                        description="Tambahkan opsi perusahaan untuk formulir di proyek ini. Jika kosong, akan menggunakan daftar default."
                        placeholder="Contoh: PT. Subkontraktor"
                        items={customCompanies}
                        setItems={setCustomCompanies}
                    />
                    <CustomListInput
                        title="Lokasi Kustom (Opsional)"
                        description="Tambahkan opsi lokasi untuk formulir di proyek ini. Jika kosong, akan menggunakan daftar default."
                        placeholder="Contoh: Area Fabrikasi"
                        items={customLocations}
                        setItems={setCustomLocations}
                    />
                </div>
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isCreating}>
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
