'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Loader2, Upload, Sparkles, Wand2, ClipboardPlus, Users } from 'lucide-react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useDebounce } from 'use-debounce';
import { assistObservation } from '@/ai/flows/assist-observation-flow';

import type { Project, Scope, Location, Company, Observation, RiskLevel, ObservationCategory, AssistObservationOutput, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/storage';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePathname, useRouter } from 'next/navigation';
import { DEFAULT_LOCATIONS, DEFAULT_COMPANIES, DEFAULT_OBSERVATION_CATEGORIES, RISK_LEVELS } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createAssignmentNotification } from '@/lib/actions/notification-actions';
import { ObservationContext } from '@/contexts/observation-context';

const formSchema = z.object({
  photo: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, `The maximum file size is 10MB.`)
    .optional(),
  location: z.string({ required_error: "Location is required." }).min(1, "Location is required."),
  company: z.string({ required_error: "Company is required." }).min(1, "Company is required."),
  findings: z.string().min(10, { message: 'Findings must be at least 10 characters long.' }),
  recommendation: z.string().optional(),
  category: z.string().min(1, "Category is required."),
  riskLevel: z.enum(RISK_LEVELS),
  responsiblePersonUid: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitObservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function SubmitObservationDialog({ isOpen, onOpenChange, project }: SubmitObservationDialogProps) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { addItem } = React.useContext(ObservationContext)!;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const pathname = usePathname();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [aiSuggestions, setAiSuggestions] = React.useState<AssistObservationOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [members, setMembers] = React.useState<UserProfile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  const isAiEnabled = userProfile?.aiEnabled ?? false;

  const companyOptions = React.useMemo(() => 
    (project?.customCompanies && project.customCompanies.length > 0) ? project.customCompanies : DEFAULT_COMPANIES,
  [project]);

  const locationOptions = React.useMemo(() => 
    (project?.customLocations && project.customLocations.length > 0) ? project.customLocations : DEFAULT_LOCATIONS,
  [project]);
  
  const categoryOptions = React.useMemo(() =>
    (project?.customObservationCategories && project.customObservationCategories.length > 0) ? project.customObservationCategories : DEFAULT_OBSERVATION_CATEGORIES,
  [project]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      photo: undefined,
      findings: '',
      recommendation: '',
      responsiblePersonUid: '',
    },
    mode: 'onChange',
  });

  const [debouncedFindings] = useDebounce(form.watch('findings'), 1500);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setPhotoPreview(null);
      setAiSuggestions(null);
      setIsSubmitting(false);
      setMembers([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onOpenChange(open);
  };
  
  React.useEffect(() => {
    async function getAiSuggestions() {
      if (!isAiEnabled) {
        setAiSuggestions(null);
        return;
      }

      if (debouncedFindings && debouncedFindings.length > 20 && userProfile) {
        setIsAiLoading(true);
        try {
          const suggestions = await assistObservation({ findings: debouncedFindings }, userProfile);
          setAiSuggestions(suggestions);
        } catch (error) {
          console.error('AI suggestion failed:', error);
          setAiSuggestions(null);
        } finally {
          setIsAiLoading(false);
        }
      } else {
        setAiSuggestions(null);
      }
    }
    getAiSuggestions();
  }, [debouncedFindings, userProfile, isAiEnabled]);
  
  React.useEffect(() => {
    if (isOpen && project && userProfile) {
        if (project.memberUids) {
            const fetchMembers = async () => {
                setIsLoadingMembers(true);
                try {
                    const memberProfilesPromises = project.memberUids.map(uid => getDoc(doc(db, 'users', uid)));
                    const memberDocs = await Promise.all(memberProfilesPromises);
                    const allMembers = memberDocs
                        .map(d => d.exists() ? (d.data() as UserProfile) : null)
                        .filter((p): p is UserProfile => p !== null && p.uid !== userProfile.uid); // Exclude self

                    const responsibleMembers = allMembers.filter(member => 
                        member.uid === project.ownerUid || project.roles?.[member.uid]?.canTakeAction === true
                    );
                    setMembers(responsibleMembers);
                } catch (error) {
                    console.error("Failed to fetch project members:", error);
                    toast({ variant: 'destructive', title: 'Failed to load project members' });
                } finally {
                    setIsLoadingMembers(false);
                }
            };
            fetchMembers();
        }
        
        form.reset({
            photo: undefined,
            location: locationOptions[0],
            company: companyOptions[0],
            category: categoryOptions[0],
            riskLevel: RISK_LEVELS[0],
            findings: '',
            recommendation: '',
            responsiblePersonUid: '',
        });
        setPhotoPreview(null);
        setAiSuggestions(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, [isOpen, project, form, locationOptions, companyOptions, categoryOptions, toast, userProfile]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = formSchema.shape.photo.safeParse(file);
      if (validation.success) {
        form.setValue('photo', file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        form.setValue('photo', undefined, { shouldValidate: true });
        setPhotoPreview(null);
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: validation.error.issues[0].message,
        });
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    if (!user || !userProfile || !project) {
      toast({ variant: 'destructive', title: 'Incomplete Data' });
      return;
    }
    setIsSubmitting(true);

    const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const optimisticId = `optimistic-${referenceId}`;
    
    const responsiblePersonName = values.responsiblePersonUid
      ? members.find(m => m.uid === values.responsiblePersonUid)?.displayName
      : undefined;

    const optimisticItem: Observation = {
        id: optimisticId,
        itemType: 'observation',
        referenceId: referenceId,
        userId: userProfile.uid,
        date: new Date().toISOString(),
        submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
        location: values.location as Location,
        company: values.company as Company,
        findings: values.findings,
        recommendation: values.recommendation || '',
        photoUrl: photoPreview,
        photoStoragePath: undefined,
        scope: project ? 'project' : 'private',
        projectId: project?.id || null,
        category: values.category as ObservationCategory,
        riskLevel: values.riskLevel,
        status: 'uploading',
        aiStatus: 'n/a',
        optimisticState: 'uploading',
        responsiblePersonUid: values.responsiblePersonUid || undefined,
        responsiblePersonName: responsiblePersonName,
    };

    addItem(optimisticItem);
    toast({ title: 'Report Submitted', description: 'Your observation report is being uploaded.' });
    handleOpenChange(false);
    
    const targetPath = `/proyek/${project.id}/observasi`;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }

    const handleBackgroundSubmit = async () => {
      try {
          const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
          const projectId = match ? match[1] : null;
          
          const scope: Scope = projectId ? 'project' : 'private';

          const observationData: Partial<Observation> = {
              itemType: 'observation' as const,
              userId: userProfile.uid,
              date: new Date().toISOString(),
              submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
              location: values.location as Location,
              company: values.company as Company,
              findings: values.findings,
              recommendation: values.recommendation || '',
              scope,
              projectId,
              referenceId,
              category: values.category as ObservationCategory,
              riskLevel: values.riskLevel,
              status: 'Pending' as const,
          };
          
          if (isAiEnabled) {
              observationData.aiStatus = 'n/a';
          }

          if (values.photo) {
            const { downloadURL, storagePath } = await uploadFile(values.photo, 'observations', userProfile.uid, () => {}, projectId);
            observationData.photoUrl = downloadURL;
            observationData.photoStoragePath = storagePath;
          } else {
            observationData.photoUrl = null;
          }

          if (values.responsiblePersonUid && responsiblePersonName) {
            observationData.responsiblePersonUid = values.responsiblePersonUid;
            observationData.responsiblePersonName = responsiblePersonName;
          }
          
          const docRef = await addDoc(collection(db, "observations"), observationData);
          
          if (values.responsiblePersonUid && projectId) {
              await createAssignmentNotification({
                  itemId: docRef.id,
                  itemType: 'observation',
                  responsiblePersonUid: values.responsiblePersonUid,
                  submitterName: userProfile.displayName,
                  description: values.findings,
                  projectId,
              });
          }

      } catch (error) {
          console.error("Submission failed:", error);
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
          toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
          // In a real app, you would need a more robust way to handle failed optimistic updates.
          // For this project, we'll just log it. The item will eventually disappear on a refresh.
      }
    };
    
    handleBackgroundSubmit();
  };
  
  const renderSelectItems = (items: readonly string[]) => {
    return items.map((item) => (
      <SelectItem key={item} value={item}>
        {item}
      </SelectItem>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPlus className="h-5 w-5" />
             Submit New Observation
          </DialogTitle>
          <DialogDescription>
            {isAiEnabled
              ? "Fill out your report. The AI will provide suggestions and in-depth analysis."
              : "Fill in the details below to add a new observation report."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField
                control={form.control}
                name="photo"
                render={() => (
                  <FormItem>
                    <FormLabel>Upload Photo (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        id="observation-photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      <Upload />
                      {photoPreview ? 'Change Photo' : 'Select Photo'}
                    </Button>
                    {photoPreview && (
                      <div className="mt-2 relative w-full h-48 rounded-md overflow-hidden border">
                        <Image src={photoPreview} alt="Photo Preview" fill sizes="(max-width: 525px) 100vw, 525px" className="object-cover" data-ai-hint="site observation" />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(locationOptions)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(companyOptions)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(categoryOptions)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="riskLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a risk level" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{renderSelectItems(RISK_LEVELS)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
                <FormField
                  control={form.control}
                  name="responsiblePersonUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Responsible Person (Optional)
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || 'none'} disabled={isSubmitting || isLoadingMembers}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingMembers ? "Loading..." : (members.length > 0 ? "Select a responsible person" : "No one available to assign")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {members.map(member => (
                            <SelectItem key={member.uid} value={member.uid}>
                              {member.displayName} ({member.position})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="findings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Findings</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the observation findings as clearly as possible." rows={5} {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isAiEnabled && (
                <div className="relative">
                  {isAiLoading && (
                    <div className="absolute top-2 right-2 z-10">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {aiSuggestions && (
                     <Alert className="bg-primary/5 border-primary/20 text-primary-foreground mt-4">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-primary font-semibold">AI Assistant Suggestions</AlertTitle>
                      <AlertDescription className="text-primary/90 space-y-3 mt-2">
                          <div className='space-y-2'>
                            {aiSuggestions.suggestedCategory && (
                              <div className="flex items-center justify-between">
                                <p>Suggested Category: <span className="font-semibold">{aiSuggestions.suggestedCategory}</span></p>
                              </div>
                            )}
                             {aiSuggestions.suggestedRiskLevel && (
                              <div className="flex items-center justify-between">
                                <p>Suggested Risk: <span className="font-semibold">{aiSuggestions.suggestedRiskLevel}</span></p>
                                <Button type="button" size="sm" variant="outline" onClick={() => form.setValue('riskLevel', aiSuggestions.suggestedRiskLevel as RiskLevel)}>Apply</Button>
                              </div>
                            )}
                          </div>
                         {aiSuggestions.improvedFindings && (
                           <div>
                              <p className="mb-1">Suggested Findings Improvement:</p>
                              <p className="p-2 bg-background/50 rounded text-sm">{aiSuggestions.improvedFindings}</p>
                              <Button type="button" size="sm" variant="outline" className="mt-1" onClick={() => form.setValue('findings', aiSuggestions.improvedFindings)}>Apply</Button>
                           </div>
                         )}
                          {aiSuggestions.suggestedRecommendation && (
                           <div>
                              <p className="mb-1">Suggested Recommendation:</p>
                               <Button type="button" size="sm" variant="outline" className="w-full justify-start text-left h-auto whitespace-normal" onClick={() => form.setValue('recommendation', aiSuggestions.suggestedRecommendation)}>
                                  <Wand2 className="mr-2 h-4 w-4 flex-shrink-0" /> {aiSuggestions.suggestedRecommendation}
                               </Button>
                           </div>
                         )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recommendation (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Write your recommendation here, or use the AI suggestion." rows={3} {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2">
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={!form.formState.isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Submit Report
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
