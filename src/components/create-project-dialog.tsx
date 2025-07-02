
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Copy, PlusCircle } from 'lucide-react';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ isOpen, onOpenChange }: CreateProjectDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const handleCopyUid = () => {
        if (!user?.uid) return;
        navigator.clipboard.writeText(user.uid);
        toast({
            title: "Copied!",
            description: "User ID Anda telah disalin ke clipboard.",
        });
    }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <PlusCircle />
              Instruksi Membuat Proyek Baru (Manual)
          </DialogTitle>
          <DialogDescription>
            Karena adanya batasan teknis, pembuatan proyek harus dilakukan secara manual melalui Firebase Console untuk saat ini.
          </DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 py-4">
            <p>Ikuti langkah-langkah berikut dengan teliti:</p>
            <ol className="list-decimal pl-6 space-y-3">
                <li>Buka Firebase Console project Anda dan navigasi ke <strong>Build &gt; Firestore Database</strong>.</li>
                <li>
                    Klik <strong>+ Start collection</strong>, masukkan <code>projects</code> sebagai Collection ID, lalu klik Next.
                </li>
                <li>
                    Klik <strong>Auto-ID</strong> untuk membuat ID dokumen proyek. Salin ID ini untuk langkah selanjutnya.
                </li>
                <li>
                    Isi field-field berikut untuk dokumen proyek baru Anda:
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li><strong>Field:</strong> <code>id</code> | <strong>Type:</strong> <code>string</code> | <strong>Value:</strong> (Tempel ID yang Anda salin)</li>
                        <li><strong>Field:</strong> <code>name</code> | <strong>Type:</strong> <code>string</code> | <strong>Value:</strong> (Beri nama proyek Anda)</li>
                        <li>
                            <strong>Field:</strong> <code>ownerUid</code> | <strong>Type:</strong> <code>string</code> | <strong>Value:</strong> (ID Pengguna Anda. Klik tombol di bawah untuk menyalinnya)
                            {user?.uid && (
                                <div className="flex items-center gap-2 my-1">
                                    <code className="text-xs p-1 bg-muted rounded">{user.uid}</code>
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={handleCopyUid}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </li>
                        <li><strong>Field:</strong> <code>memberUids</code> | <strong>Type:</strong> <code>array</code> | <strong>Value 0:</strong> (Masukkan ID Pengguna Anda lagi sebagai anggota pertama)</li>
                         <li><strong>Field:</strong> <code>createdAt</code> | <strong>Type:</strong> <code>string</code> | <strong>Value:</strong> (Masukkan tanggal hari ini dalam format `YYYY-MM-DDTHH:MM:SS.sssZ`)</li>
                    </ul>
                </li>
                <li>Klik <strong>Save</strong> untuk membuat proyek.</li>
            </ol>
            <p>Setelah proyek dibuat, Anda bisa kembali ke aplikasi dan menggunakan fitur <strong>Gabung Proyek</strong> untuk menambahkannya ke akun Anda.</p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Mengerti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
