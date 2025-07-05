
'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { LogOut, UserCircle, Loader2, Edit, Folder, Camera, Sparkles, KeyRound } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { useProjects } from '@/hooks/use-projects';
import { uploadFile } from '@/lib/storage';
import { Switch } from './ui/switch';

export function UserAccountSheet() {
  const { user, userProfile, loading: authLoading, logout, updateUserProfile } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const { toast } = useToast();
  
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = React.useState('');
  const [position, setPosition] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [aiEnabled, setAiEnabled] = React.useState(true);
  const [googleAiApiKey, setGoogleAiApiKey] = React.useState('');
  
  const isLoading = authLoading || (user && projectsLoading);
  const hasProject = projects.length > 0;

  React.useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPosition(userProfile.position || 'Not Set');
      setCompany(userProfile.company || '');
      setAiEnabled(userProfile.aiEnabled ?? true);
      setGoogleAiApiKey(userProfile.googleAiApiKey || '');
    }
  }, [userProfile]);
  
  const handleEditClick = () => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPosition(userProfile.position || 'Not Set');
      setCompany(userProfile.company || '');
      setAiEnabled(userProfile.aiEnabled ?? true);
      setGoogleAiApiKey(userProfile.googleAiApiKey || '');
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!displayName.trim() || !position.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Display name and position cannot be empty.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName, position, company, aiEnabled, googleAiApiKey });
      toast({ title: 'Profile Updated', description: 'Your information has been saved.' });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your profile.' });
    } finally {
      setIsSaving(false);
    }
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !user) return;
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      // Use a specific, non-project-related path for profile photos
      const { downloadURL, storagePath } = await uploadFile(file, `profile-photos/${user.uid}`, user.uid, () => {});
      await updateUserProfile(user.uid, { photoURL: downloadURL, photoStoragePath: storagePath });
      toast({ title: 'Photo Updated!', description: 'Your new profile photo has been saved.' });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({ variant: 'destructive', title: 'Upload Failed', description: errorMessage });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name?.trim()) {
      return 'U';
    }
    const names = name.trim().split(' ').filter(n => n.length > 0);
    
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    
    if (names.length === 1) {
        return names[0][0].toUpperCase();
    }

    return 'U';
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setIsEditing(false);
    }
  };

  const renderSkeleton = () => (
    <div className="p-6 space-y-6 animate-pulse">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <Separator/>
        <div className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
        </div>
        <Skeleton className="h-10 w-full" />
    </div>
  );

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
                {authLoading ? <Loader2 className="animate-spin" /> : getInitials(userProfile?.displayName)}
              </AvatarFallback>
            </Avatar>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>My Account</SheetTitle>
          <SheetDescription>
            Manage your account settings and project.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? renderSkeleton() : user && userProfile ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative group flex-shrink-0">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.photoURL || undefined} alt={userProfile.displayName ?? ''} data-ai-hint="user avatar" />
                    <AvatarFallback className="text-2xl">
                      {getInitials(userProfile.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Change profile photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                    className="hidden"
                    accept="image/png, image/jpeg"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{userProfile.displayName}</p>
                  <p className="text-sm text-muted-foreground">{userProfile.position}</p>
                   {userProfile.company && <p className="text-sm text-muted-foreground">{userProfile.company}</p>}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base mb-2">Profile Settings</h3>
                    <div className='space-y-3'>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    <div className='space-y-3 mt-3'>
                      <Label htmlFor="position">Position / Jabatan</Label>
                      <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
                    </div>
                     <div className='space-y-3 mt-3'>
                      <Label htmlFor="company">Perusahaan</Label>
                      <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., PT. Konstruksi Utama" />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-base mb-3">AI Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <Label htmlFor="ai-enabled" className="flex items-center gap-2"><Sparkles className="h-4 w-4"/>Enable AI Features</Label>
                          <p className="text-xs text-muted-foreground">Turn AI assistance on or off.</p>
                        </div>
                        <Switch id="ai-enabled" checked={aiEnabled} onCheckedChange={setAiEnabled} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api-key" className="flex items-center gap-2"><KeyRound className="h-4 w-4"/>Your Google AI API Key (Optional)</Label>
                        <Input id="api-key" type="password" placeholder="Enter your own API key" value={googleAiApiKey} onChange={(e) => setGoogleAiApiKey(e.target.value)} />
                        <p className="text-xs text-muted-foreground">If provided, this key will be used for your AI requests.</p>
                      </div>
                    </div>
                  </div>

                   <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 animate-spin" />}
                          Save Changes
                      </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={handleEditClick}>
                  <Edit className="mr-2" />
                  Edit Profile & Settings
                </Button>
              )}
              
              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Folder className="h-5 w-5 text-muted-foreground"/>My Projects</h3>
                {hasProject ? (
                  <ul className="space-y-2">
                    {projects.map(project => (
                      <li key={project.id} className="text-sm flex items-center gap-3 text-muted-foreground"><Folder className="h-4 w-4 text-primary" />{project.name}</li>
                    ))}
                  </ul>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground pl-3">You are not in any projects yet. Go to the <Link href="/beranda" onClick={() => setIsSheetOpen(false)} className="text-primary hover:underline">Project Hub</Link> to create or join one.</p>
                    </>
                )}
              </div>

              <Separator />

              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>Copyright © 2024 CV Arzan Sirah Persada. All rights reserved.</p>
              </div>

            </div>
          ) : (
            <div className="text-center p-6">
              <p className="text-muted-foreground">You are not signed in.</p>
            </div>
          )}
        </div>
        
        {user && (
            <SheetFooter className="p-4 border-t mt-auto">
                <SheetClose asChild>
                    <Button onClick={logout} className="w-full" variant="outline">
                        <LogOut className="mr-2" />
                        Sign Out
                    </Button>
                </SheetClose>
            </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
