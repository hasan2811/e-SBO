
'use client';

import * as React from 'react';
import type { Project, UserProfile, MemberRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserX, Loader2, Download, FileCog, Crown, ShieldCheck, Gavel, Save, SlidersHorizontal, Users } from 'lucide-react';
import { RemoveMemberDialog } from '@/components/remove-member-dialog';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { CustomListInput } from './custom-list-input';
import { exportToExcel } from '@/lib/export';
import type { AllItems } from '@/lib/types';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useProjects } from '@/hooks/use-projects';
import { useCallback, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
                    title: 'No Data to Export',
                    description: `There are no reports in the ${project.name} project.`
                });
                return;
            }

            const fileName = `Export_${project.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
            // Dynamically import xlsx to reduce initial bundle size
            const success = await exportToExcel(allItems, fileName);

            if (success) {
                toast({
                    title: 'Export Successful',
                    description: `Reports for ${project.name} are being downloaded.`
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Export Failed',
                    description: 'No valid data was found to export.'
                });
            }
        } catch (error) {
            console.error("Export failed:", error);
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: 'An error occurred while fetching data for export.'
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Export Report Data</CardTitle>
                <CardDescription>Download all observation, inspection, and PTW data from this project into an Excel file.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
                    {isExporting ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />}
                    Start Export
                </Button>
            </CardContent>
        </Card>
    );
};

// ## Dumb Component for Project Settings ##
const ProjectSettingsTab = ({
  project,
  customCompanies, setCustomCompanies,
  customLocations, setCustomLocations,
  customCategories, setCustomCategories,
  isProjectOpen, setIsProjectOpen
}: {
  project: Project;
  customCompanies: string[]; setCustomCompanies: (items: string[]) => void;
  customLocations: string[]; setCustomLocations: (items: string[]) => void;
  customCategories: string[]; setCustomCategories: (items: string[]) => void;
  isProjectOpen: boolean; setIsProjectOpen: (isOpen: boolean) => void;
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Access</CardTitle>
          <CardDescription>Control who can join this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="project-open" className="font-medium">Open to Join</Label>
              <p className="text-xs text-muted-foreground">
                If enabled, any user can see and join this project.
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
          <CardTitle>Custom Form Options</CardTitle>
          <CardDescription>Manage dropdown options for forms in this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CustomListInput
            inputId="custom-categories-manage"
            title="Custom Observation Categories"
            description="If empty, the default list will be used."
            placeholder="Enter a new category name"
            items={customCategories}
            setItems={setCustomCategories}
          />
          <CustomListInput
            inputId="custom-companies-manage"
            title="Custom Companies"
            description="Add or remove company options for forms."
            placeholder="Enter a new company name"
            items={customCompanies}
            setItems={setCustomCompanies}
          />
          <CustomListInput
            inputId="custom-locations-manage"
            title="Custom Locations"
            description="Add or remove location options for forms."
            placeholder="Enter a new location name"
            items={customLocations}
            setItems={setCustomLocations}
          />
        </CardContent>
      </Card>
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

// ## Dumb Component for Member List ##
const MemberListTab = ({ 
  project, 
  members,
  roles,
  onRemoveClick,
  onRoleChange
}: { 
  project: Project;
  members: UserProfile[];
  roles: Project['roles'];
  onRemoveClick: (member: UserProfile) => void;
  onRoleChange: (memberId: string, role: keyof MemberRole, value: boolean) => void;
}) => {
    const { userProfile } = useAuth();
    const isCurrentUserOwner = userProfile?.uid === project.ownerUid;

    return (
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
                                <CardTitle className="truncate">{member.displayName || 'Unknown User'}</CardTitle>
                                <CardDescription className="truncate">{member.position || 'No Position'}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {isOwner && <Badge variant="secondary" className="border-amber-500/50"><Crown className="h-3 w-3 mr-1.5 text-amber-500" />Owner</Badge>}
                                {memberRoles.canApprovePtw && <Badge variant="outline" className="text-green-700 border-green-300"><ShieldCheck className="h-3 w-3 mr-1.5" />Approver</Badge>}
                                {memberRoles.canTakeAction && <Badge variant="outline" className="text-blue-700 border-blue-300"><Gavel className="h-3 w-3 mr-1.5" />Action Taker</Badge>}
                            </div>
                            {isCurrentUserOwner && !isOwner && (
                                <>
                                    <Separator/>
                                    <div className="space-y-3">
                                        <SwitchWithLabel
                                            id={`approve-${member.uid}`}
                                            label="Can Approve PTW"
                                            description="Can approve Permits to Work."
                                            checked={memberRoles.canApprovePtw ?? false}
                                            onCheckedChange={(val) => onRoleChange(member.uid, 'canApprovePtw', val)}
                                        />
                                        <SwitchWithLabel
                                            id={`action-${member.uid}`}
                                            label="Can Take Action"
                                            description="Can close out reports."
                                            checked={memberRoles.canTakeAction ?? false}
                                            onCheckedChange={(val) => onRoleChange(member.uid, 'canTakeAction', val)}
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
                                    <UserX className="mr-2" /> Remove
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
};


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
    const { userProfile } = useAuth();
    const { projects, updateProject } = useProjects();
    
    // ## STATE MANAGEMENT ##
    const [activeTab, setActiveTab] = React.useState('members');
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    // Get the authoritative project object directly from the context
    const currentProject = useMemo(() => 
        projects.find(p => p.id === initialProject.id),
    [projects, initialProject.id]);
    
    // Local state for displaying member profiles and managing edits
    const [members, setMembers] = React.useState<UserProfile[]>([]);
    const [memberToRemove, setMemberToRemove] = React.useState<UserProfile | null>(null);

    // Local state for UI edits, initialized from the authoritative project object
    const [roles, setRoles] = React.useState<Project['roles']>({});
    const [customCompanies, setCustomCompanies] = React.useState<string[]>([]);
    const [customLocations, setCustomLocations] = React.useState<string[]>([]);
    const [customCategories, setCustomCategories] = React.useState<string[]>([]);
    const [isProjectOpen, setIsProjectOpen] = React.useState(true);

    const isCurrentUserOwner = userProfile?.uid === initialProject.ownerUid;

    // ## DATA SYNC & FETCHING ##
    React.useEffect(() => {
        if (isOpen && currentProject) {
            // Sync local editing state whenever the authoritative project from context changes
            setRoles(currentProject.roles || {});
            setCustomCompanies(currentProject.customCompanies || []);
            setCustomLocations(currentProject.customLocations || []);
            setCustomCategories(currentProject.customObservationCategories || []);
            setIsProjectOpen(currentProject.isOpen ?? true);

            // Fetch member profiles for display based on UIDs from the authoritative project
            const fetchMemberProfiles = async () => {
                setIsLoadingData(true);
                if (currentProject.memberUids?.length > 0) {
                    try {
                        const memberDocs = await Promise.all(
                            currentProject.memberUids.map(uid => getDoc(doc(db, 'users', uid)))
                        );
                        const memberProfiles = memberDocs
                            .map(snap => snap.data() as UserProfile)
                            .filter(Boolean)
                            .sort((a, b) => (a.uid === currentProject.ownerUid ? -1 : b.uid === currentProject.ownerUid ? 1 : 0));
                        setMembers(memberProfiles);
                    } catch (error) {
                         console.error("Failed to fetch member profiles:", error);
                         toast({ variant: 'destructive', title: 'Could not load member details.' });
                    }
                } else {
                    setMembers([]);
                }
                setIsLoadingData(false);
            };

            fetchMemberProfiles();
        }
    }, [isOpen, currentProject, toast]);


    // ## EVENT HANDLERS ##
    const handleRoleChange = (memberId: string, role: keyof MemberRole, value: boolean) => {
        setRoles(prev => ({
            ...prev,
            [memberId]: {
                ...prev?.[memberId],
                [role]: value,
            },
        }));
    };

    const handleSaveChanges = useCallback(async () => {
        setIsSaving(true);
        const projectRef = doc(db, 'projects', initialProject.id);
        const updatedData = {
            roles,
            customCompanies,
            customLocations,
            customObservationCategories: customCategories,
            isOpen: isProjectOpen,
        };
        try {
          await updateDoc(projectRef, updatedData);
          updateProject(initialProject.id, updatedData); // Optimistic update of global context
          toast({
            title: 'Settings Saved',
            description: 'Your project settings have been successfully updated.',
          });
          onOpenChange(false);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save your project settings. Please try again.',
          });
        } finally {
          setIsSaving(false);
        }
    }, [roles, customCompanies, customLocations, customCategories, isProjectOpen, initialProject.id, updateProject, toast, onOpenChange]);

    const showSaveButton = isCurrentUserOwner && (activeTab === 'members' || activeTab === 'settings');

    // Render nothing if project data is not yet available in the context
    if (!currentProject) {
        return null;
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                          <FileCog />
                          Manage "{currentProject.name}"
                        </DialogTitle>
                        <DialogDescription>
                            View members, manage roles & settings, and export project data.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                        <div className="px-6 border-b flex-shrink-0">
                            <TooltipProvider delayDuration={100}>
                                <TabsList className="grid w-full grid-cols-3">
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value="members">
                                        <Users className="h-4 w-4" />
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Members & Roles</p>
                                    </TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value="settings">
                                        <SlidersHorizontal className="h-4 w-4" />
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Project Settings</p>
                                    </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value="export">
                                        <Download className="h-4 w-4" />
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Export Data</p>
                                    </TooltipContent>
                                    </Tooltip>
                                </TabsList>
                            </TooltipProvider>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <div className="p-6">
                                <TabsContent value="members" className="mt-0">
                                    {isLoadingData ? <MemberListSkeleton /> : 
                                    <MemberListTab 
                                        project={currentProject} 
                                        members={members} 
                                        roles={roles}
                                        onRemoveClick={setMemberToRemove} 
                                        onRoleChange={handleRoleChange}
                                    />
                                    }
                                </TabsContent>
                                <TabsContent value="settings" className="mt-0">
                                    <ProjectSettingsTab 
                                    project={currentProject}
                                    customCompanies={customCompanies} setCustomCompanies={setCustomCompanies}
                                    customLocations={customLocations} setCustomLocations={setCustomLocations}
                                    customCategories={customCategories} setCustomCategories={setCustomCategories}
                                    isProjectOpen={isProjectOpen} setIsProjectOpen={setIsProjectOpen}
                                    />
                                </TabsContent>
                                <TabsContent value="export" className="mt-0">
                                    <ExportCard project={currentProject} />
                                </TabsContent>
                            </div>
                        </div>
                    </Tabs>
                    
                    {showSaveButton && (
                       <DialogFooter className="p-4 border-t bg-background flex-shrink-0">
                          <Button onClick={handleSaveChanges} disabled={isSaving}>
                              {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                              Save Changes
                          </Button>
                      </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
            
            {memberToRemove && currentProject && (
              <RemoveMemberDialog
                isOpen={!!memberToRemove}
                onOpenChange={(open) => !open && setMemberToRemove(null)}
                project={currentProject}
                member={memberToRemove}
                onSuccess={() => setMemberToRemove(null)}
              />
            )}
        </>
    );
}
