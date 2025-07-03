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
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';

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
          <div className="flex flex-wrap gap-2">
            {customCompanies.map(company => (
              <Badge key={company} variant="secondary" className="text-base py-1 pl-3 pr-2">
                {company}
                <button onClick={() => handleRemoveCompany(company)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {company}</span>
                </button>
              </Badge>
            ))}
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
          <div className="flex flex-wrap gap-2">
            {customLocations.map(location => (
              <Badge key={location} variant="secondary" className="text-base py-1 pl-3 pr-2">
                {location}
                <button onClick={() => handleRemoveLocation(location)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {location}</span>
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save All Settings
            </Button>
        </CardFooter>
      </Card>
    </div>
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
    const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);

    const isOwner = user && project && project.ownerUid === user.uid;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage "{project.name}"</DialogTitle>
                        <DialogDescription>
                            View members or manage project settings.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <Tabs defaultValue={defaultTab} key={defaultTab} className="flex flex-col h-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="members">Members ({project.members?.length || 0})</TabsTrigger>
                                {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
                            </TabsList>
                            <ScrollArea className="flex-1 mt-4 pr-4">
                                <TabsContent value="members">
                                    <div className="grid gap-4 md:grid-cols-2">
                                    {project.members?.sort((a,b) => (a.uid === project.ownerUid ? -1 : 1)).map(member => (
                                        <Card key={member.uid} className="flex flex-col">
                                        <CardHeader className="flex flex-row items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                            <AvatarImage src={member.photoURL ?? undefined} data-ai-hint="person face" />
                                            <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                            <CardTitle className="truncate">{member.displayName || 'Unknown User'}</CardTitle>
                                            <CardDescription className="truncate">{member.position || 'No Position'}</CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex justify-between items-center bg-muted/50 p-3 mt-auto">
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
                                        </CardContent>
                                        </Card>
                                    ))}
                                    </div>
                                </TabsContent>
                                {isOwner && (
                                    <TabsContent value="settings">
                                    <ProjectSettings project={project} />
                                    </TabsContent>
                                )}
                            </ScrollArea>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>
            
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
}
