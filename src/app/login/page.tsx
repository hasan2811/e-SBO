'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import * as z from 'zod'; // Perubahan 1: Tambahkan impor Zod

import { useAuth } from '@/hooks/use-auth';
// Perubahan 2: Hapus 'SignInSchema' dari impor di bawah ini
import { type SignInInput as AuthSignInInput } from '@/contexts/auth-context'; // Kita beri nama alias untuk menghindari konflik
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/app-logo';


// Perubahan 3: Definisikan Schema dan Tipe DI SINI
const SignInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type SignInInput = z.infer<typeof SignInSchema>;


export default function LoginPage() {
  const { signInWithEmailAndPassword, user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Perubahan 4: Perbaiki cara memanggil fungsi signInWithEmailAndPassword
  async function onSubmit(values: SignInInput) {
    setIsLoading(true);
    try {
      // Panggil dengan dua argumen (email dan password), bukan satu objek
      await signInWithEmailAndPassword(values.email, values.password);
      router.push('/beranda');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.code === 'auth/invalid-credential' 
          ? 'Invalid email or password.'
          : error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (!loading && user) {
      router.push('/beranda');
    }
  }, [user, loading, router]);

  if (loading || user) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Tidak ada perubahan sama sekali pada bagian tampilan di bawah ini
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary/50 p-4">
      <Card className="w-full max-w-sm p-4 shadow-xl">
        <CardHeader className="text-center p-2">
           <div className="flex justify-center mb-4">
              <AppLogo className="h-12 w-12" />
            </div>
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="p-4 pt-2 flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-accent hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}