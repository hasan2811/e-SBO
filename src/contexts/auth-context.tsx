'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  Unsubscribe,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { z } from 'zod';
import type { UserProfile } from '@/lib/types';

export const SignUpSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});
export type SignInInput = z.infer<typeof SignInSchema>;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUpWithEmailAndPassword: (data: SignUpInput) => Promise<void>;
  signInWithEmailAndPassword: (data: SignInInput) => Promise<void>;
  updateUserProfile: (uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'position'>>) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const auth = getAuth(app);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      // Unsubscribe from previous profile listener if it exists
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
      
      setLoading(true);

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        profileUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Profile doesn't exist, let's create it.
            // This handles first-time sign-ups.
            const newUserProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              displayName: user.displayName || 'New User',
              position: 'Not Set',
              photoURL: user.photoURL,
              projectIds: [],
            };
            try {
              await setDoc(userDocRef, newUserProfile);
              // The onSnapshot listener will automatically pick up the new profile data.
            } catch (error) {
               console.error("Failed to create user profile document:", error);
            }
          }
          setUser(user);
          setLoading(false);
        }, (error) => {
           console.error("Error with user profile listener:", error);
           setUser(null);
           setUserProfile(null);
           setLoading(false);
        });
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  const signUpWithEmailAndPasswordHandler = useCallback(async ({ email, password, displayName }: SignUpInput) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName });

      const userDocRef = doc(db, 'users', user.uid);
      const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
        position: 'Not Set',
        photoURL: user.photoURL,
        projectIds: [],
      };
      await setDoc(userDocRef, newUserProfile);
       // The onAuthStateChanged listener will then pick this up.
    } catch (error) {
      console.error('Error signing up: ', error);
      throw error;
    }
  }, []);

  const signInWithEmailAndPasswordHandler = useCallback(async ({ email, password }: SignInInput) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in: ', error);
      throw error;
    }
  }, []);
  
  const handleUpdateUserProfile = useCallback(async (uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'position'>>) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
      throw new Error("Permission denied.");
    }

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);

    if (data.displayName && data.displayName !== auth.currentUser.displayName) {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
    }
    
    // The onSnapshot listener will handle updating the state automatically.
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    signUpWithEmailAndPassword: signUpWithEmailAndPasswordHandler,
    signInWithEmailAndPassword: signInWithEmailAndPasswordHandler,
    updateUserProfile: handleUpdateUserProfile,
    logout,
  }), [user, userProfile, loading, signUpWithEmailAndPasswordHandler, signInWithEmailAndPasswordHandler, handleUpdateUserProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
