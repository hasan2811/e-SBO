

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Search, LogIn, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { collection, query, getDocs, limit, doc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';

const formSchema = z.object({
  searchTerm: z.string().min(1, { message: 'Please enter a search term.' }),
});

type FormValues = z.infer<typeof formSchema>;
type ProjectSearchResult = { id: string; name: string };

interface JoinProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinProjectDialog({ isOpen, onOpenChange }: JoinProjectDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isSearching, setIsSearching] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<ProjectSearchResult[]>([]);
  const formId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { searchTerm: '' },
  });

  const onSearch = async (values: FormValues) => {
    setIsSearching(true);
    setSearchResults([]);
    try {
      // Fetch all projects (or a reasonable limit) and filter on the client.
      // This avoids the need for a composite index on the 'name' field.
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, limit(200)); // Limit to 200 projects for performance
      const snapshot = await getDocs(q);
      
      const allProjects = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));

      const lowerCaseSearchTerm = values.searchTerm.toLowerCase();
      const results = allProjects.filter(project => 
        project.name.toLowerCase().includes(lowerCaseSearchTerm)
      );

      setSearchResults(results);

      if (results.length === 0) {
        toast({ variant: 'default', title: 'No Results', description: 'No projects found matching your search.' });
      }
    } catch (error) {
      console.error("Project search failed:", error);
      toast({ variant: 'destructive', title: 'Search Error', description: 'Could not perform search. Please check your connection and try again.' });
    } finally {
      setIsSearching(false);
    }
  };

  const onJoin = async (projectToJoin: ProjectSearchResult) => {
    if (!user || !userProfile) return;

    if (userProfile.projectIds?.includes(projectToJoin.id)) {
      toast({ variant: 'default', title: 'Already a Member', description: 'You are already a member of this project.' });
      return;
    }

    setIsJoining(projectToJoin.id);
    try {
        const projectRef = doc(db, 'projects', projectToJoin.id);
        const userRef = doc(db, 'users', user.uid);

        await runTransaction(db, async (transaction) => {
          // Add user to project's member list
          transaction.update(projectRef, {
              memberUids: arrayUnion(user.uid)
          });
          // Add project to user's project list
          transaction.update(userRef, {
              projectIds: arrayUnion(projectToJoin.id)
          });
        });
        
        toast({ title: 'Success!', description: `Successfully joined the project "${projectToJoin.name}"!` });
        onOpenChange(false);
    } catch (error) {
        console.error("Failed to join project:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.'});
    } finally {
        setIsJoining(null);
    }
  }

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSearchResults([]);
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Join an Existing Project
          </DialogTitle>
          <DialogDescription>
            Search for a project by name and join it to start collaborating.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSearch)} className="flex items-start gap-2 py-4">
            <FormField
              control={form.control}
              name="searchTerm"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Enter project name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSearching} size="icon" aria-label="Search">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </Form>
        <div className="mt-4 h-[200px]">
            <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                    {isSearching && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    {!isSearching && searchResults.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-8">Enter a name above and search.</p>
                    )}
                    {!isSearching && searchResults.map(project => (
                        <div key={project.id} className="flex items-center justify-between rounded-md border p-3">
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-5 w-5 text-primary" />
                                <span className="font-medium">{project.name}</span>
                            </div>
                            <Button size="sm" onClick={() => onJoin(project)} disabled={!!isJoining}>
                                {isJoining === project.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Join
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
