
'use client';

import * as React from 'react';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { JoinProjectDialog } from '@/components/join-project-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderPlus } from 'lucide-react';

export default function WelcomePage() {
  const [isJoinDialogOpen, setJoinDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);

  return (
    <>
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-lg text-center p-8 border-dashed">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <FolderPlus className="h-16 w-16 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Selamat Datang di HSSE Tech</CardTitle>
                <CardDescription className="mt-2 max-w-sm mx-auto">
                    Anda belum menjadi anggota proyek mana pun. Buat proyek baru atau gabung dengan proyek yang sudah ada untuk memulai.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        Buat Proyek Baru
                    </Button>
                    <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
                        Gabung Proyek
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>

      <JoinProjectDialog isOpen={isJoinDialogOpen} onOpenChange={setJoinDialogOpen} />
      <CreateProjectDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
