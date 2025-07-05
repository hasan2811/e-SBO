
'use client';

import * as React from 'react';
import type { Project, UserProfile, AllItems } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, User, UserX, Loader2, Trash2, LogOut, Download, FileCog } from 'lucide-react';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { CustomListInput } from './custom-list-input';
import { DeleteProjectDialog } from './delete-project-dialog';
import { LeaveProjectDialog } from './leave-project-dialog';
import { useRouter } from 'next/navigation';
import { exportToExcel } from '@/lib/export';

const getInitials = (name: string | null | undefined): string => {
    if (!name?.trim()) return 'U';
    const names = name.trim().split(' ').filter(n => n.length > 0);
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names.length === 1) {
        return names[0][0].toUpperCase();
    }
    return 'U';
};

const ExportCard = ({ project }: { project: Project }) => {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = React.useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const itemTypes = ['observations', 'inspections', 'ptws'];
            const fetchPromises = itemTypes.map(type => 
                getDocs(query(collection(db, type), where("projectId", "==", project.id)))
            );
            
            const snapshots = await Promise.all(fetchPromises);
            const allItems = snapshots.flatMap(snapshot => 
                snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems))
            );

            if (allItems.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'Tidak Ada Data untuk Diekspor',
                    description: `Tidak ada laporan di proyek ${project.name}.`
                });
                return;
            }

            const fileName = `Export_${project.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
            const success = exportToExcel(allItems, fileName);

            if (success) {
                toast({
                    title: 'Ekspor Berhasil',
                    description: `Laporan untuk ${project.name} sedang diunduh.`
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Ekspor Gagal',
                    description: 'Tidak ada data valid yang ditemukan untuk diekspor.'
                });
            }
        } catch (error) {
            console.error("Export failed:", error);
            toast({
                variant: 'destructive',
                title: 'Ekspor Gagal',
                description: 'Terjadi kesalahan saat mengambil data untuk ekspor.'
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ekspor Data Laporan</CardTitle>
                <CardDescription>Unduh semua data observasi, inspeksi, dan PTW dari proyek ini ke dalam file Excel.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
                    {isExporting ? <Loader2 className="mr-2" /> : <Download className="mr-2" />}
                    Mulai Ekspor
                </Button>
            </CardContent>
        </Card>
    );
}

const ProjectSettings = ({ project, onProjectUpdate }: { project: Project, onProjectUpdate: (updatedData: Partial<Project>) => void }) => {
  const { toast } = useToast();
  const [customCompanies, setCustomCompanies] = React.useState<string[]>([]);
  const [customLocations, setCustomLocations] = React.useState<string[]>([]);
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);
  const [isProjectOpen, setIsProjectOpen] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setCustomCompanies(project.customCompanies || []);
    setCustomLocations(project.customLocations || []);
    setCustomCategories(project.customObservationCategories || []);
    setIsProjectOpen(project.isOpen ?? true);
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    const projectRef = doc(db, 'projects', project.id);
    const updatedData = {
        customCompanies,
        customLocations,
        customObservationCategories: customCategories,
        isOpen: isProjectOpen,
    };
    try {
      await updateDoc(projectRef, updatedData);
      toast({
        title: 'Settings Saved',
        description: 'Your project settings have been updated.',
      });
      onProjectUpdate(updatedData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your project settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
            <CardTitle>Akses Proyek</CardTitle>
            <CardDescription>Kontrol siapa yang dapat bergabung dengan proyek ini.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <Label htmlFor="project-open" className="font-medium">Buka untuk Bergabung</Label>
                    <p className="text-xs text-muted-foreground">
                        Jika diaktifkan, pengguna mana pun dapat melihat dan bergabung dengan proyek ini.
                    </p>
                </div>
                <Switch
                    id="project-open"
                    checked={isProjectOpen}
                    onCheckedChange={setIsProjectOpen}
                />
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Opsi Formulir Kustom</CardTitle>
            <CardDescription>Kelola opsi dropdown untuk formulir di proyek ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <CustomListInput
                inputId="custom-categories-manage"
                title="Kategori Observasi Kustom"
                description="Jika kosong, akan menggunakan daftar default: Open, Close."
                placeholder="Masukkan nama kategori baru"
                items={customCategories}
                setItems={setCustomCategories}
            />
            <CustomListInput
                inputId="custom-companies-manage"
                title="Perusahaan Kustom"
                description="Tambahkan atau hapus opsi perusahaan untuk formulir."
                placeholder="Masukkan nama perusahaan baru"
                items={customCompanies}
                setItems={setCustomCompanies}
            />
            
            <CustomListInput
                inputId="custom-locations-manage"
                title="Lokasi Kustom"
                description="Tambahkan atau hapus opsi lokasi untuk formulir."
                placeholder="Masukkan nama lokasi baru"
                items={customLocations}
                setItems={setCustomLocations}
            />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Semua Pengaturan
          </Button>
      </div>
    </div>
  );
};

// Simplified "dumb" component for displaying the member list
const MemberList = ({ members, isLoading, projectOwnerUid, currentUid, onRemoveClick }: { 
    members: UserProfile[], 
    isLoading: boolean,
    projectOwnerUid: string,
    currentUid: string | undefined,
    onRemoveClick: (member: UserProfile) => void,
}) => {
    
    if (isLoading) {
        return <div className="grid gap-4 md:grid-cols-2 p-1">
            {Array.from({ length: 2 }).map((_, index) => (
                <Card key={index} className="flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    </div>
                </CardHeader>
                <CardFooter className="flex justify-between items-center bg-muted/50 p-3 mt-auto">
                    <Skeleton className="h-5 w-1/3" />
                </CardFooter>
                </Card>
            ))}
        </div>;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 p-1">
            {members.sort((a, b) => (a.uid === projectOwnerUid ? -1 : 1)).map(member => (
                <Card key={member.uid} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4 pb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.photoURL ?? undefined} data-ai-hint="person face" />
                        <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="truncate">{member.displayName || 'Unknown User'}</CardTitle>
                        <CardDescription className="truncate">{member.position || 'No Position'}</CardDescription>
                      </div>
                  </CardHeader>
                  <CardFooter className="flex justify-between items-center bg-muted/50 p-3 mt-auto">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                      {member.uid === projectOwnerUid ? (
                          <>
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span className="text-amber-600">Owner</span>
                          </>
                      ) : (
                          <>
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Member</span>
                          </>
                      )}
                      </div>
                      {member.uid !== currentUid && (
                      <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onRemoveClick(member)}
                      >
                          <UserX className="mr-2 h-4 w-4" />
                          Remove
                      </Button>
                      )}
                  </CardFooter>
                </Card>
            ))}
        </div>
    );
}

interface ManageProjectDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project;
}

export function ManageProjectDialog({ isOpen, onOpenChange, project: initialProject }: ManageProjectDialogProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [currentProject, setCurrentProject] = React.useState(initialProject);
    const [members, setMembers] = React.useState<UserProfile[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
    
    const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);
    const [isLeaveOpen, setIsLeaveOpen] = React.useState(false);
    const [isDeleteOpen, setDeleteOpen] = React.useState(false);

    // Centralized data fetching, runs only when dialog opens.
    React.useEffect(() => {
        if (!isOpen) return;

        // Reset state on open
        setCurrentProject(initialProject);
        setMembers([]);
        setIsLoadingMembers(true);

        const fetchMembers = async () => {
            if (!initialProject?.memberUids || initialProject.memberUids.length === 0) {
                setMembers([]);
                setIsLoadingMembers(false);
                return;
            }
            try {
                const memberDocs = await Promise.all(
                    initialProject.memberUids.map(uid => getDoc(doc(db, 'users', uid)))
                );
                const memberProfiles: UserProfile[] = [];
                memberDocs.forEach(docSnap => {
                    if (docSnap.exists()) {
                        memberProfiles.push(docSnap.data() as UserProfile);
                    }
                });
                setMembers(memberProfiles);
            } catch (error) {
                console.error("Failed to fetch project members:", error);
                toast({ variant: 'destructive', title: 'Could not load members.' });
            } finally {
                setIsLoadingMembers(false);
            }
        };

        fetchMembers();
    }, [isOpen, initialProject, toast]);


    // Update local state to reflect changes without a full refetch
    const handleProjectUpdate = (updatedData: Partial<Project>) => {
        setCurrentProject(prev => ({ ...prev, ...updatedData }));
    };
    
    const handleMemberRemoved = (removedMemberId: string) => {
        const updatedMembers = members.filter(m => m.uid !== removedMemberId);
        const updatedUids = currentProject.memberUids.filter(uid => uid !== removedMemberId);
        setMembers(updatedMembers);
        setCurrentProject(prev => ({ ...prev, memberUids: updatedUids }));
        setMemberToRemove(null);
    };

    const handleActionSuccess = () => {
        setIsLeaveOpen(false);
        setDeleteOpen(false);
        onOpenChange(false);
        router.push('/beranda');
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2">
                          <FileCog className="h-5 w-5"/>
                          Kelola "{currentProject.name}"
                        </DialogTitle>
                        <DialogDescription>
                            Lihat anggota, kelola pengaturan, dan ekspor data proyek.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden px-6 pb-4">
                        <Tabs defaultValue="members" className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="grid w-full shrink-0 grid-cols-3">
                                <TabsTrigger value="members">Anggota ({currentProject.memberUids?.length || 0})</TabsTrigger>
                                <TabsTrigger value="settings">Pengaturan</TabsTrigger>
                                <TabsTrigger value="export">Ekspor</TabsTrigger>
                            </TabsList>
                            
                            <ScrollArea className="flex-1 mt-4 -mr-6 pr-6">
                                <TabsContent value="members" className="mt-0">
                                    <MemberList 
                                        members={members} 
                                        isLoading={isLoadingMembers}
                                        projectOwnerUid={currentProject.ownerUid}
                                        currentUid={user?.uid}
                                        onRemoveClick={setMemberToRemove}
                                    />
                                </TabsContent>
                                <TabsContent value="settings" className="mt-0">
                                    <ProjectSettings project={currentProject} onProjectUpdate={handleProjectUpdate} />
                                </TabsContent>
                                 <TabsContent value="export" className="mt-0 p-1">
                                    <ExportCard project={currentProject} />
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 justify-between">
                         <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                            <Trash2 className="mr-2"/> Hapus Proyek
                        </Button>
                        <Button variant="outline" onClick={() => setIsLeaveOpen(true)}>
                            <LogOut className="mr-2"/> Tinggalkan Proyek
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {memberToRemove && (
              <RemoveMemberDialog
                isOpen={!!memberToRemove}
                onOpenChange={(open) => !open && setMemberToRemove(null)}
                project={currentProject}
                member={memberToRemove}
                onSuccess={handleMemberRemoved}
              />
            )}
            <LeaveProjectDialog
                isOpen={isLeaveOpen}
                onOpenChange={setIsLeaveOpen}
                project={currentProject}
                onSuccess={handleActionSuccess}
            />
             <DeleteProjectDialog
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                project={currentProject}
                onSuccess={handleActionSuccess}
            />
        </>
    );
}
