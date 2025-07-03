'use client';

import * as React from 'react';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  type Auth,
  type User
} from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase'; // Pastikan path ini benar

// Definisikan tipe untuk konteks
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean; // Anda menggunakan ini di project-context
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
}

// Buat Konteks
export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// =================================================================
// INI BAGIAN PENTING: Gunakan 'export function' bukan 'export default'
// =================================================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  // Asumsi sederhana untuk isAdmin, sesuaikan dengan logika Anda
  const isAdmin = user ? user.email === 'admin@example.com' : false;

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(firebaseAuth, email, pass);
  };

  const signUp = (email: string, pass: string) => {
    return createUserWithEmailAndPassword(firebaseAuth, email, pass);
  };

  const signOutUser = () => {
    return signOut(firebaseAuth);
  };

  const value = { user, loading, isAdmin, signIn, signUp, signOut: signOutUser };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}