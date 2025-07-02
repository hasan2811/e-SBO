
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function ProjectHubPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCreateTestProject = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }
    setIsLoading(true);
    console.log('Mencoba membuat proyek...');

    try {
      console.log("LANGKAH 1: Mencoba menulis dokumen proyek baru...");
      const docRef = await addDoc(collection(db, 'projects'), {
        name: `Test Project ${new Date().getTime()}`,
        ownerUid: user.uid,
        memberUids: [user.uid],
        createdAt: serverTimestamp(),
      });
      console.log("LANGKAH 1 BERHASIL! Dokumen dibuat dengan ID: ", docRef.id);
      toast({ title: 'Success!', description: `Test project created with ID: ${docRef.id}` });
    } catch (error: any) {
      console.error("GAGAL PADA LANGKAH 1 (MEMBUAT PROYEK):", error);
      toast({
        variant: 'destructive',
        title: 'Failed to Create Project',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-card p-8 rounded-lg">
      <h3 className="mt-4 text-2xl font-bold">Uji Coba Penulisan Database</h3>
      <p className="mt-2 max-w-md text-muted-foreground">
        Tekan tombol di bawah ini untuk mencoba melakukan satu operasi tulis ke koleksi 'projects'.
        Periksa konsol browser untuk melihat pesan keberhasilan atau kegagalan.
      </p>
      <div className="mt-6">
        <Button onClick={handleCreateTestProject} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Jalankan Tes Tulis
        </Button>
      </div>
    </div>
  );
}
