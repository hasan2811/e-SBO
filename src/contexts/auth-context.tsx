
'use client';

import * as React from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, Unsubscribe, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import * as z from 'zod';
import type { UserProfile } from '@/lib/types';

export const SignUpSchema = z.object({
  displayName: z.string().min(3, { message: 'Display name must be at least 3 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});
export type SignInInput = z.infer<typeof SignInSchema>;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithEmailAndPassword: (input: SignInInput) => Promise<void>;
  signUpWithEmailAndPassword: (input: SignUpInput) => Promise<void>;
  updateUserProfile: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (unsubscribe) {
        unsubscribe();
      }

      if (authUser) {
        // Keep loading true until profile is fetched
        const userDocRef = doc(db, 'users', authUser.uid);
        unsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);
            // The super admin UID from your requests
            setIsAdmin(profile.uid === 'GzR8FeByeKhJ0vZoeo5Zj4M0Ftl2');
          } else {
            // This can happen briefly during sign up before profile is created
            setUserProfile(null);
            setIsAdmin(false);
          }
          setLoading(false); // Set loading to false only after profile is fetched or confirmed not to exist
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
          setIsAdmin(false);
          setLoading(false);
        });
      } else {
        // No user, so no profile to fetch. Stop loading.
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signInWithEmailAndPassword_ = async ({ email, password }: SignInInput) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmailAndPassword_ = async ({ displayName, email, password }: SignUpInput) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    const userDocRef = doc(db, 'users', newUser.uid);
    await setDoc(userDocRef, {
      uid: newUser.uid,
      displayName,
      email: newUser.email,
      photoURL: newUser.photoURL,
      position: 'Not Set',
      company: 'Unassigned',
      projectIds: [],
      aiEnabled: true,
      googleAiApiKey: '',
    });
  };
  
  const updateUserProfile_ = async (uid: string, data: Partial<UserProfile>) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
      throw new Error("Cannot update another user's profile.");
    }
    
    // 1. Prepare data for Firebase Authentication update (displayName, photoURL)
    const authUpdateData: { displayName?: string; photoURL?: string | null } = {};
    if (data.displayName !== undefined) {
      authUpdateData.displayName = data.displayName;
    }
    // Use `hasOwnProperty` to allow setting photoURL to null (removing photo)
    if (data.hasOwnProperty('photoURL')) {
      authUpdateData.photoURL = data.photoURL;
    }

    // 2. Update Firebase Authentication profile if there's anything to update
    if (Object.keys(authUpdateData).length > 0) {
      await updateProfile(auth.currentUser, authUpdateData);
    }
    
    // 3. Update Firestore document with all provided data
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
  };

  const logout_ = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    userProfile,
    loading,
    isAdmin,
    signInWithEmailAndPassword: signInWithEmailAndPassword_,
    signUpWithEmailAndPassword: signUpWithEmailAndPassword_,
    updateUserProfile: updateUserProfile_,
    logout: logout_,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
