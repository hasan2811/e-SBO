
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Search, LogIn, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { findProjectsByName, joinProject } from '@/lib/actions/project-actions';
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

const formSchema = z.object({
  searchTerm: z.string().min(3, { message: 'Search term must be at least 3 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;
type ProjectSearchResult = { id: string; name: string };

interface JoinProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinProjectDialog({ isOpen, onOpenChange }: JoinProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSearching, setIsSearching] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState<string | null>(null); // store project id being joined
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
      const results = await findProjectsByName(values.searchTerm);
      setSearchResults(results);
      if (results.length === 0) {
        toast({ variant: 'default', title: 'No Results', description: 'No projects found with that name.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Search Error', description: 'Could not perform search.' });
    } finally {
      setIsSearching(false);
    }
  };

  const onJoin = async (projectId: string) => {
    if (!user) return;
    setIsJoining(projectId);
    try {
        const result = await joinProject(projectId, user.uid);
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Join Failed', description: result.message });
        }
    } catch (error) {
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
                            <Button size="sm" onClick={() => onJoin(project.id)} disabled={!!isJoining}>
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
