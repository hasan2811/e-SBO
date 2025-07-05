
'use client';

import * as React from 'react';
import type { Project, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, User, UserX, Loader2, X } from 'lucide-react';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';


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

const ProjectSettings = ({ project }: { project: Project }) => {
  const { toast } = useToast();
  const [customCompanies, setCustomCompanies] = React.useState(project.customCompanies || []);
  const [newCompany, setNewCompany] = React.useState("");
  const [customLocations, setCustomLocations] = React.useState(project.customLocations || []);
  const [newLocation, setNewLocation] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleAddCompany = () => {
    if (newCompany.trim() && !customCompanies.includes(newCompany.trim())) {
      setCustomCompanies([...customCompanies, newCompany.trim()]);
      setNewCompany("");
    }
  };
  const handleRemoveCompany = (company: string) => setCustomCompanies(customCompanies.filter(c => c !== company));
  const handleAddLocation = () => {
    if (newLocation.trim() && !customLocations.includes(newLocation.trim())) {
      setCustomLocations([...customLocations, newLocation.trim()]);
      setNewLocation("");
    }
  };
  const handleRemoveLocation = (location: string) => setCustomLocations(customLocations.filter(l => l !== location));

  const handleSave = async () => {
    setIsSaving(true);
    const projectRef = doc(db, 'projects', project.id);
    try {
      await updateDoc(projectRef, {
        customCompanies: customCompanies,
        customLocations: customLocations,
      });
      toast({
        title: 'Settings Saved',
        description: 'Your custom dropdown lists have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your custom lists. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <CardTitle>Manage Custom Companies</CardTitle>
          <CardDescription>Add or remove company options for observation forms in this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a new company name"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
            />
            <Button onClick={handleAddCompany}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 rounded-md border p-3 min-h-[40px]">
            {customCompanies.length > 0 ? customCompanies.map(company => (
              <Badge key={company} variant="secondary" className="text-base py-1 pl-3 pr-2">
                {company}
                <button onClick={() => handleRemoveCompany(company)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {company}</span>
                </button>
              </Badge>
            )) : <span className="text-sm text-muted-foreground">No custom companies added.</span>}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Custom Locations</CardTitle>
          <CardDescription>Add or remove location options for observation forms in this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a new location name"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
            />
            <Button onClick={handleAddLocation}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 rounded-md border p-3 min-h-[40px]">
            {customLocations.length > 0 ? customLocations.map(location => (
              <Badge key={location} variant="secondary" className="text-base py-1 pl-3 pr-2">
                {location}
                <button onClick={() => handleRemoveLocation(location)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {location}</span>
                </button>
              </Badge>
            )) : <span className="text-sm text-muted-foreground">No custom locations added.</span>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save All Settings
          </Button>
      </div>
    </div>
  );
};


const MemberList = ({ project }: { project: Project }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [members, setMembers] = React.useState<UserProfile[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
    const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);

    const isOwner = user && project && project.ownerUid === user.uid;

    React.useEffect(() => {
        if (!project?.memberUids) {
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
            <div className="grid gap-4 md:grid-cols-2">
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
                />
            )}
        </>
    );
};


interface ManageProjectDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project;
    defaultTab: 'members' | 'settings';
}

export function ManageProjectDialog({ isOpen, onOpenChange, project, defaultTab }: ManageProjectDialogProps) {
    const { user } = useAuth();
    const isOwner = user && project && project.ownerUid === user.uid;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage "{project.name}"</DialogTitle>
                    <DialogDescription>
                        View members or manage project settings.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue={defaultTab} key={`${project.id}-${defaultTab}`} className="flex flex-col h-full">
                        <TabsList className={cn("grid w-full", isOwner ? "grid-cols-2" : "grid-cols-1")}>
                            <TabsTrigger value="members">Members ({project.memberUids?.length || 0})</TabsTrigger>
                            {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
                        </TabsList>
                        <ScrollArea className="flex-1 mt-4 pr-4">
                            <TabsContent value="members" className="mt-0">
                                <MemberList project={project} />
                            </TabsContent>
                            {isOwner && (
                                <TabsContent value="settings" className="mt-0">
                                  <ProjectSettings project={project} />
                                </TabsContent>
                            )}
                        </ScrollArea>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
