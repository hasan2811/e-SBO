'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
  signInWithGoogle: () => Promise<void>;
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // This case handles users created via Google Sign-In for the first time
          // or legacy users. A profile is created for them.
           const newUserProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName || 'New User',
            position: 'Not Set',
          };
          await setDoc(userDocRef, newUserProfile);
          setUserProfile(newUserProfile);
        }
        setUser(user);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        const newUserProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName || 'New User',
            position: 'Not Set',
          };
        await setDoc(userDocRef, newUserProfile);
        // The onAuthStateChanged listener will then pick this up.
      }
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      throw error;
    }
  };

  const signUpWithEmailAndPasswordHandler = async ({ email, password, displayName }: SignUpInput) => {
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
      };
      await setDoc(userDocRef, newUserProfile);
       // The onAuthStateChanged listener will then pick this up.
    } catch (error) {
      console.error('Error signing up: ', error);
      throw error;
    }
  };

  const signInWithEmailAndPasswordHandler = async ({ email, password }: SignInInput) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in: ', error);
      throw error;
    }
  };
  
  const handleUpdateUserProfile = async (uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'position'>>) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
      throw new Error("Permission denied.");
    }

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);

    if (data.displayName && data.displayName !== auth.currentUser.displayName) {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
    }
    
    // Refresh local state to reflect changes immediately
    setUserProfile(prev => prev ? { ...prev, ...data } as UserProfile : null);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signUpWithEmailAndPassword: signUpWithEmailAndPasswordHandler,
    signInWithEmailAndPassword: signInWithEmailAndPasswordHandler,
    updateUserProfile: handleUpdateUserProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
