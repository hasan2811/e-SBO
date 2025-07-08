
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, FileSignature, FileText, Users } from 'lucide-react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

import type { Ptw, Location, Project, Scope, UserProfile } from '@/lib/types';
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
import { DEFAULT_LOCATIONS, DEFAULT_COMPANIES } from '@/lib/types';
import { createAssignmentNotification } from '@/lib/actions/notification-actions';
import { ObservationContext } from '@/contexts/observation-context';


const formSchema = z.object({
  location: z.string().min(1, 'Location is required.'),
  workDescription: z.string().min(10, { message: 'Work description must be at least 10 characters.' }),
  contractor: z.string().min(1, 'Contractor is required.'),
  jsaPdf: z
    .instanceof(File, { message: 'JSA (PDF) file is required.' })
    .refine((file) => file.type === 'application/pdf', 'File must be a PDF.')
    .refine((file) => file.size <= 10 * 1024 * 1024, `Maximum file size is 10MB.`),
  responsiblePersonUid: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitPtwDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function SubmitPtwDialog({ isOpen, onOpenChange, project }: SubmitPtwDialogProps) {
  const [fileName, setFileName] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { addItem } = React.useContext(ObservationContext)!;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const pathname = usePathname();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [members, setMembers] = React.useState<UserProfile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  
  const locationOptions = React.useMemo(() => 
    (project?.customLocations && project.customLocations.length > 0) ? project.customLocations : DEFAULT_LOCATIONS,
  [project]);

  const companyOptions = React.useMemo(() =>
    (project?.customCompanies && project.customCompanies.length > 0) ? project.customCompanies : DEFAULT_COMPANIES,
  [project]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workDescription: '',
      responsiblePersonUid: '',
    },
    mode: 'onChange',
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setFileName(null);
      setIsSubmitting(false);
      setMembers([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onOpenChange(open);
  };
  
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

                    const approverMembers = allMembers.filter(member => 
                        member.uid === project.ownerUid || project.roles?.[member.uid]?.canApprovePtw === true
                    );
                    setMembers(approverMembers);
                } catch (error) {
                    console.error("Failed to fetch project members:", error);
                } finally {
                    setIsLoadingMembers(false);
                }
            };
            fetchMembers();
        }

        form.reset({
            location: locationOptions[0],
            contractor: companyOptions[0],
            workDescription: '',
            responsiblePersonUid: '',
        });
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

    }
  }, [isOpen, project, form, locationOptions, companyOptions, userProfile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = formSchema.shape.jsaPdf.safeParse(file);
      if (validation.success) {
        form.setValue('jsaPdf', file, { shouldValidate: true });
        setFileName(file.name);
      } else {
        form.setValue('jsaPdf', undefined, { shouldValidate: true });
        setFileName(null);
        toast({ variant: 'destructive', title: 'Invalid File', description: validation.error.issues[0].message });
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    if (!user || !userProfile || !values.jsaPdf || !project) {
        toast({ variant: 'destructive', title: 'Incomplete Data' });
        return;
    }
    setIsSubmitting(true);
    
    const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const optimisticId = `optimistic-${referenceId}`;

    const responsiblePersonName = values.responsiblePersonUid
        ? members.find(m => m.uid === values.responsiblePersonUid)?.displayName
        : undefined;

    const optimisticItem: Ptw = {
      id: optimisticId,
      itemType: 'ptw',
      referenceId,
      userId: userProfile.uid,
      date: new Date().toISOString(),
      submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
      location: values.location as Location,
      workDescription: values.workDescription,
      contractor: values.contractor,
      jsaPdfUrl: '', // Placeholder
      jsaPdfStoragePath: '', // Placeholder
      status: 'uploading',
      scope: project ? 'project' : 'private',
      projectId: project?.id || null,
      optimisticState: 'uploading',
      responsiblePersonUid: values.responsiblePersonUid || undefined,
      responsiblePersonName: responsiblePersonName,
    };

    addItem(optimisticItem);
    toast({ title: 'PTW Submitted', description: 'Your PTW is being uploaded.' });
    handleOpenChange(false);

    const targetPath = `/proyek/${project.id}/ptw`;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }

    const handleBackgroundSubmit = async () => {
      try {
          const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
          const projectId = match ? match[1] : null;

          const { downloadURL, storagePath } = await uploadFile(values.jsaPdf!, 'ptw-jsa', userProfile.uid, () => {}, projectId);

          const scope: Scope = projectId ? 'project' : 'private';
          
          const ptwData: any = {
              itemType: 'ptw',
              userId: userProfile.uid,
              date: new Date().toISOString(),
              submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
              location: values.location as Location,
              workDescription: values.workDescription,
              contractor: values.contractor,
              jsaPdfUrl: downloadURL,
              jsaPdfStoragePath: storagePath,
              scope,
              projectId,
              referenceId,
              status: 'Pending Approval',
          };

          if (values.responsiblePersonUid && responsiblePersonName) {
            ptwData.responsiblePersonUid = values.responsiblePersonUid;
            ptwData.responsiblePersonName = responsiblePersonName;
          }

          const docRef = await addDoc(collection(db, 'ptws'), ptwData);

          if (values.responsiblePersonUid && projectId) {
              await createAssignmentNotification({
                  itemId: docRef.id,
                  itemType: 'ptw',
                  responsiblePersonUid: values.responsiblePersonUid,
                  submitterName: userProfile.displayName,
                  description: `PTW Approval: ${values.workDescription}`,
                  projectId,
              });
          }

      } catch (error) {
          console.error("Submission failed:", error);
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
          toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
      }
    };
    
    handleBackgroundSubmit();
  };
  
  const renderSelectItems = (items: readonly string[]) => items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Submit New PTW</DialogTitle>
          <DialogDescription>Fill in the details below to submit a new Permit to Work.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="location" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a location"/></SelectTrigger></FormControl><SelectContent>{renderSelectItems(locationOptions)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="contractor" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Contractor</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a contractor"/></SelectTrigger></FormControl><SelectContent>{renderSelectItems(companyOptions)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>

              <FormField
                control={form.control}
                name="responsiblePersonUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Approver
                    </FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || 'none'} disabled={isSubmitting || isLoadingMembers}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingMembers ? "Loading..." : (members.length > 0 ? "Select an approver" : "No approvers available")} />
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

              <FormField name="workDescription" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Work Description</FormLabel><FormControl><Textarea placeholder="Describe the work to be performed in detail." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="jsaPdf" control={form.control} render={() => (
                <FormItem><FormLabel>Upload JSA (PDF)</FormLabel>
                  <FormControl>
                    <Input id="ptw-jsa-upload" type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  </FormControl>
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />{fileName ? 'Change File' : 'Select PDF File'}
                  </Button>
                  {fileName && <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /><span>{fileName}</span></div>}
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t flex flex-col gap-2">
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" form={formId} disabled={!form.formState.isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Submit PTW
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
