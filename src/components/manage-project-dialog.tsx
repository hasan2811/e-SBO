
'use client';

import * as React from 'react';
import type { Project, UserProfile, MemberRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserX, Loader2, Download, FileCog, Crown, ShieldCheck, Gavel, Save } from 'lucide-react';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { CustomListInput } from './custom-list-input';
import { exportToExcel } from '@/lib/export';
import type { AllItems } from '@/lib/types';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useProjects } from '@/hooks/use-projects';

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
                    {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                    Mulai Ekspor
                </Button>
            </CardContent>
        </Card>
    );
};

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
            {isSaving && <Loader2 className="animate-spin" />}
            Simpan Semua Pengaturan
          </Button>
      </div>
    </div>
  );
};

const SwitchWithLabel = ({ id, label, description, checked, onCheckedChange }: { id: string, label: string, description: string, checked: boolean, onCheckedChange: (checked: boolean) => void }) => (
    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
            <Label htmlFor={id} className="font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
);

const MemberList = ({ project, members, onRemoveClick }: { 
    project: Project;
    members: UserProfile[];
    onRemoveClick: (member: UserProfile) => void;
}) => {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const { updateProject } = useProjects();
    
    const [roles, setRoles] = React.useState<Project['roles']>(project.roles || {});
    const [isSaving, setIsSaving] = React.useState(false);
    
    const isCurrentUserOwner = userProfile?.uid === project.ownerUid;

    const handleRoleChange = (memberId: string, role: keyof MemberRole, value: boolean) => {
        setRoles(prev => ({
            ...prev,
            [memberId]: {
                ...prev?.[memberId],
                [role]: value,
            },
        }));
    };

    const handleSaveRoles = async () => {
        if (!isCurrentUserOwner) return;
        setIsSaving(true);
        const projectRef = doc(db, 'projects', project.id);
        try {
            await updateDoc(projectRef, { roles });
            updateProject(project.id, { roles }); // Optimistic update
            toast({ title: "Peran berhasil diperbarui!" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Gagal memperbarui peran." });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Reset local roles state if the project prop changes
    React.useEffect(() => {
        setRoles(project.roles || {});
    }, [project]);

    return (
        <div className="space-y-6 p-1">
            <div className="grid gap-4 md:grid-cols-2">
                {members.map(member => {
                    const memberRoles = roles?.[member.uid] || {};
                    const isOwner = member.uid === project.ownerUid;
                    return (
                        <Card key={member.uid} className="flex flex-col">
                            <CardHeader className="flex flex-row items-center gap-4 pb-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={member.photoURL ?? undefined} data-ai-hint="person face" />
                                    <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <CardTitle className="truncate">{member.displayName || 'Pengguna Tidak Dikenal'}</CardTitle>
                                    <CardDescription className="truncate">{member.position || 'Tidak Ada Posisi'}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {isOwner && <Badge variant="secondary" className="border-amber-500/50"><Crown className="h-3 w-3 mr-1.5 text-amber-500" />Pemilik</Badge>}
                                    {memberRoles.canApprovePtw && <Badge variant="outline" className="text-green-700 border-green-300"><ShieldCheck className="h-3 w-3 mr-1.5" />Approver</Badge>}
                                    {memberRoles.canTakeAction && <Badge variant="outline" className="text-blue-700 border-blue-300"><Gavel className="h-3 w-3 mr-1.5" />Action Taker</Badge>}
                                </div>
                                {isCurrentUserOwner && !isOwner && (
                                    <>
                                        <Separator/>
                                        <div className="space-y-3">
                                            <SwitchWithLabel
                                                id={`approve-${member.uid}`}
                                                label="Izin Menyetujui PTW"
                                                description="Dapat menyetujui Izin Kerja."
                                                checked={memberRoles.canApprovePtw ?? false}
                                                onCheckedChange={(val) => handleRoleChange(member.uid, 'canApprovePtw', val)}
                                            />
                                            <SwitchWithLabel
                                                id={`action-${member.uid}`}
                                                label="Izin Ambil Tindakan"
                                                description="Dapat menyelesaikan laporan."
                                                checked={memberRoles.canTakeAction ?? false}
                                                onCheckedChange={(val) => handleRoleChange(member.uid, 'canTakeAction', val)}
                                            />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-end items-center bg-muted/50 p-3 mt-auto">
                                {!isOwner && isCurrentUserOwner && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => onRemoveClick(member)}
                                    >
                                        <UserX /> Keluarkan
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
            {isCurrentUserOwner && (
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveRoles} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        Simpan Perubahan Peran
                    </Button>
                </div>
            )}
        </div>
    );
}

const MemberListSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 p-1">
        {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="flex flex-col">
            <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                </div>
            </CardHeader>
            <CardFooter className="flex justify-end items-center bg-muted/50 p-3 mt-auto">
                <Skeleton className="h-9 w-24 rounded-md" />
            </CardFooter>
            </Card>
        ))}
    </div>
);

interface ManageProjectDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project;
}

export function ManageProjectDialog({ isOpen, onOpenChange, project: initialProject }: ManageProjectDialogProps) {
    const { toast } = useToast();
    const [currentProject, setCurrentProject] = React.useState(initialProject);
    const [members, setMembers] = React.useState<UserProfile[]>([]);
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);

    React.useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const projectRef = doc(db, 'projects', initialProject.id);
                const projectSnap = await getDoc(projectRef);

                if (!projectSnap.exists()) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                    onOpenChange(false);
                    return;
                }
                const projectData = projectSnap.data() as Project;
                setCurrentProject(projectData);

                if (projectData.memberUids?.length > 0) {
                    const memberDocs = await Promise.all(
                        projectData.memberUids.map(uid => getDoc(doc(db, 'users', uid)))
                    );
                    const memberProfiles = memberDocs
                        .map(snap => snap.data() as UserProfile)
                        .filter(Boolean)
                        .sort((a, b) => (a.uid === projectData.ownerUid ? -1 : 1));
                    setMembers(memberProfiles);
                } else {
                    setMembers([]);
                }
            } catch (error) {
                console.error("Failed to fetch project data:", error);
                toast({ variant: 'destructive', title: 'Could not load project data.' });
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [isOpen, initialProject.id, toast, onOpenChange]);


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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2">
                          <FileCog />
                          Kelola "{currentProject.name}"
                        </DialogTitle>
                        <DialogDescription>
                            Lihat anggota, kelola peran & pengaturan, dan ekspor data proyek.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden px-6 pb-4">
                        <Tabs defaultValue="members" className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="grid w-full shrink-0 grid-cols-3">
                                <TabsTrigger value="members">Anggota & Peran ({currentProject.memberUids?.length || 0})</TabsTrigger>
                                <TabsTrigger value="settings">Pengaturan</TabsTrigger>
                                <TabsTrigger value="export">Ekspor</TabsTrigger>
                            </TabsList>
                            
                            <ScrollArea className="flex-1 mt-4 -mr-6 pr-6">
                                <TabsContent value="members" className="mt-0">
                                    {isLoadingData ? <MemberListSkeleton /> : <MemberList project={currentProject} members={members} onRemoveClick={setMemberToRemove} />}
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
        </>
    );
}
