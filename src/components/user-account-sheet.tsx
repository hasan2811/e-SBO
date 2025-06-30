
'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, UserCircle, Loader2, Edit, PlusCircle, Folder, Users } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { useProjects } from '@/hooks/use-projects';
import { ProjectDialog } from './project-dialog';

export function UserAccountSheet() {
  const { user, userProfile, loading: authLoading, logout, updateUserProfile } = useAuth();
  const { projects, loading: projectsLoading, addProject } = useProjects();
  const { toast } = useToast();
  
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isProjectDialogOpen, setProjectDialogOpen] = React.useState(false);

  const [displayName, setDisplayName] = React.useState('');
  const [position, setPosition] = React.useState('');
  
  const isLoading = authLoading || projectsLoading;

  React.useEffect(() => {
    if (userProfile && !isEditing) {
      setDisplayName(userProfile.displayName);
      setPosition(userProfile.position);
    }
  }, [userProfile, isEditing]);


  const handleSave = async () => {
    if (!user) return;
    
    if (!displayName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Display name cannot be empty.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName, position });
      toast({ title: 'Profile Updated', description: 'Your information has been saved.' });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your profile.' });
    } finally {
      setIsSaving(false);
    }
  }

  const handleAddProject = async (projectName: string, memberEmails: string) => {
    await addProject(projectName, memberEmails);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setIsEditing(false);
    }
  };

  return (
    <>
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage 
                src={user?.photoURL || undefined} 
                alt={user?.displayName ?? 'User'} 
                data-ai-hint="user avatar"
              />
              <AvatarFallback>
                {authLoading ? <Loader2 className="animate-spin" /> : <UserCircle />}
              </AvatarFallback>
            </Avatar>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>My Account</SheetTitle>
          <SheetDescription>
            Manage your account settings and preferences.
          </SheetDescription>
        </SheetHeader>
        <div className="py-8">
          {authLoading ? ( // Use authLoading for the initial skeleton
             <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
                <Separator/>
                <Skeleton className="h-10 w-full" />
              </div>
          ) : user && userProfile ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName ?? ''} data-ai-hint="user avatar" />
                  <AvatarFallback className="text-2xl">
                    {getInitials(userProfile.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{userProfile.displayName}</p>
                  <p className="text-sm text-muted-foreground">{userProfile.position}</p>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className='space-y-1'>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor="position">Position / Jabatan</Label>
                    <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
                  </div>
                   <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 animate-spin" />}
                          Save
                      </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2" />
                  Edit Profile
                </Button>
              )}
              
              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-5 w-5"/>My Projects</h3>
                {projectsLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                ) : projects.length > 0 ? (
                  <ul className="space-y-2">
                    {projects.map(project => (
                      <li key={project.id} className="text-sm flex items-center gap-2 text-muted-foreground"><Folder className="h-4 w-4" />{project.name}</li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">You are not a member of any projects yet.</p>
                }
                <Button variant="outline" className="w-full mt-4" onClick={() => setProjectDialogOpen(true)}>
                  <PlusCircle className="mr-2" />
                  Create New Project
                </Button>
              </div>

            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground">You are not signed in. Please go to the login page.</p>
            </div>
          )}
          <Separator className="my-6" />
            <div className="text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-sm text-foreground">HSSE Tech v1.001</p>
                <div className="pt-2">
                <p>Copyright © 2024 CV Arzan Sirah Persada</p>
                <p>All rights reserved.</p>
                </div>
                <div className="pt-2">
                <p>Design by: Arzan (+971502861769)</p>
                </div>
            </div>
        </div>
        <SheetFooter className="mt-auto">
            {user ? (
                <SheetClose asChild>
                    <Button onClick={logout} className="w-full" variant="outline">
                        <LogOut className="mr-2" />
                        Sign Out
                    </Button>
                </SheetClose>
            ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
    
    <ProjectDialog
        isOpen={isProjectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onAddProject={handleAddProject}
    />
    </>
  );
}
