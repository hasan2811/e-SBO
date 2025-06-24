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
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/use-auth';
import { LogIn, LogOut, UserCircle, Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export function UserAccountSheet() {
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed from sheet", error);
      setIsSigningIn(false);
    }
  };


  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <Sheet>
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
          {authLoading ? (
             <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
          ) : user ? (
            <div className="flex flex-col items-center text-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName ?? ''} data-ai-hint="user avatar" />
                <AvatarFallback className="text-2xl">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground">You are not signed in.</p>
            </div>
          )}
        </div>
        <SheetFooter className="mt-auto">
            {user ? (
              <Button onClick={logout} className="w-full">
                <LogOut className="mr-2" />
                Sign Out
              </Button>
            ) : (
               <Button onClick={handleSignIn} className="w-full" disabled={isSigningIn || authLoading}>
                {isSigningIn ? (
                    <Loader2 className="mr-2 animate-spin" />
                ) : (
                    <LogIn className="mr-2" />
                )}
                {isSigningIn ? 'Signing In...' : 'Sign In with Google'}
              </Button>
            )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
