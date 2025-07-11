
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { SignUpSchema, type SignUpInput } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/app-logo';

export default function RegisterPage() {
  const { signUpWithEmailAndPassword, user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: SignUpInput) {
    setIsLoading(true);
    try {
      await signUpWithEmailAndPassword(values);
      router.push('/beranda');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.code === 'auth/email-already-in-use' 
          ? 'An account with this email already exists.'
          : error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  React.useEffect(() => {
    // This effect manages the splash screen and redirection logic.
    if (!loading) {
      if (user) {
        // User is already logged in, so we redirect.
        // We keep the splash screen visible during the redirect.
        router.push('/beranda');
      } else {
        // No user is logged in, hide the splash screen to show the form.
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.classList.add('splash-hidden');
        }
      }
    }
  }, [user, loading, router]);
  
  // The page is rendered but hidden by the splash screen until auth is checked.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary/50 p-4">
      <Card className="w-full max-w-sm p-4 shadow-xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
              <AppLogo className="h-12 w-12" />
            </div>
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input id="displayName" placeholder="John Doe" autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input id="email" type="email" placeholder="john.doe@example.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input id="password" type="password" placeholder="********" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
      <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
        <p>Copyright © 2024 CV Arzan Sirah Persada. All rights reserved.</p>
      </div>
    </div>
  );
}
