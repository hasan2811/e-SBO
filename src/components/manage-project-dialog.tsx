
'use client';

import * as React from 'react';
import type { Project, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, User, UserX, Loader2, Trash2, LogOut } from 'lucide-react';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

const ProjectSettings = ({ project, onProjectUpdate }: { project: Project, onProjectUpdate: (updatedData: Partial<Project>) => void }) => {
  const { toast } = useToast();
  const [customCompanies, setCustomCompanies] = React.useState<string[]>([]);
  const [customLocations, setCustomLocations] = React.useState<string[]>([]);
  const [isProjectOpen, setIsProjectOpen] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // This effect ensures that the local state of this component is always
  // in sync with the `project` prop, which comes from the global context.
  // This prevents stale data from being shown in the settings form.
  React.useEffect(() => {
    setCustomCompanies(project.customCompanies || []);
    setCustomLocations(project.customLocations || []);
    setIsProjectOpen(project.isOpen ?? true);
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    const projectRef = doc(db, 'projects', project.id);
    const updatedData = {
        customCompanies: customCompanies,
        customLocations: customLocations,
        isOpen: isProjectOpen,
    };
    try {
      await updateDoc(projectRef, updatedData);
      toast({
        title: 'Settings Saved',
        description: 'Your project settings have been updated.',
      });
      onProjectUpdate(updatedData); // Notify parent component of the change
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


const MemberList = ({ project, onMemberRemoved }: { project: Project, onMemberRemoved: (removedMemberId: string) => void }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [members, setMembers] = React.useState<UserProfile[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
    const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);

    const isOwner = user && project && project.ownerUid === user.uid;

    React.useEffect(() => {
        if (!project?.memberUids || project.memberUids.length === 0) {
            setMembers([]);
            setIsLoadingMembers(false);
            return;
        }

        const fetchMembers = async () => {
            setIsLoadingMembers(true);
            try {
                const memberDocs = await Promise.all(
                    project.memberUids.map(uid => getDoc(doc(db, 'users', uid)))
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
    }, [project?.memberUids, toast]);

    const renderSkeleton = () => (
      Array.from({ length: 2 }).map((_, index) => (
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
      ))
    );

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 p-1">
                {isLoadingMembers ? renderSkeleton() : members.sort((a,b) => (a.uid === project.ownerUid ? -1 : 1)).map(member => (
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
                          {member.uid === project.ownerUid ? (
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
                          {isOwner && member.uid !== user?.uid && (
                          <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setMemberToRemove(member)}
                          >
                              <UserX className="mr-2 h-4 w-4" />
                              Remove
                          </Button>
                          )}
                      </CardFooter>
                    </Card>
                ))}
            </div>
             {memberToRemove && project && (
                <RemoveMemberDialog
                isOpen={!!memberToRemove}
                onOpenChange={(open) => !open && setMemberToRemove(null)}
                project={project}
                member={memberToRemove}
                onSuccess={onMemberRemoved}
                />
            )}
        </>
    );
};


interface ManageProjectDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project;
}

export function ManageProjectDialog({ isOpen, onOpenChange, project }: ManageProjectDialogProps) {
    const { user } = useAuth();
    const router = useRouter();
    const isOwner = user && project && project.ownerUid === user.uid;
    const [currentProject, setCurrentProject] = React.useState(project);
    const [isLeaveOpen, setLeaveOpen] = React.useState(false);
    const [isDeleteOpen, setDeleteOpen] = React.useState(false);

    React.useEffect(() => {
        setCurrentProject(project);
    }, [project]);

    const handleProjectUpdate = (updatedData: Partial<Project>) => {
        setCurrentProject(prev => ({ ...prev, ...updatedData }));
    };
    
    const handleActionSuccess = () => {
        setLeaveOpen(false);
        setDeleteOpen(false);
        onOpenChange(false); // Close the manage dialog
        router.push('/beranda');
    };

    const handleMemberRemoved = (removedMemberId: string) => {
        setCurrentProject(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                memberUids: prev.memberUids.filter(uid => uid !== removedMemberId)
            };
        });
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Kelola "{currentProject.name}"</DialogTitle>
                        <DialogDescription>
                            Lihat anggota dan kelola pengaturan proyek.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden px-6">
                        <Tabs defaultValue="members" key={`${currentProject.id}-members`} className="flex flex-col h-full">
                            <TabsList className={cn("grid w-full", isOwner ? "grid-cols-2" : "grid-cols-1")}>
                                <TabsTrigger value="members">Anggota ({currentProject.memberUids?.length || 0})</TabsTrigger>
                                {isOwner && <TabsTrigger value="settings">Pengaturan</TabsTrigger>}
                            </TabsList>
                            <div className="flex-1 mt-4 overflow-hidden">
                            <ScrollArea className="h-full pr-4 -mr-4">
                                <TabsContent value="members" className="mt-0">
                                    <MemberList project={currentProject} onMemberRemoved={handleMemberRemoved} />
                                </TabsContent>
                                {isOwner && (
                                    <TabsContent value="settings" className="mt-0">
                                        <ProjectSettings project={currentProject} onProjectUpdate={handleProjectUpdate} />
                                    </TabsContent>
                                )}
                            </ScrollArea>
                            </div>
                        </Tabs>
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
                        {isOwner ? (
                             <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                                <Trash2 className="mr-2"/> Hapus Proyek
                            </Button>
                        ) : (
                            <Button variant="destructive" onClick={() => setLeaveOpen(true)}>
                                <LogOut className="mr-2"/> Tinggalkan Proyek
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <LeaveProjectDialog
                isOpen={isLeaveOpen}
                onOpenChange={setLeaveOpen}
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
