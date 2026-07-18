'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginAsMock: (name?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  loginAsMock: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mockUserStr = localStorage.getItem('mock_user');
      if (mockUserStr) {
        try {
          setUser(JSON.parse(mockUserStr));
          setLoading(false);
          return;
        } catch (e) {
          localStorage.removeItem('mock_user');
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mock_user');
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out of Firebase Auth:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const loginAsMock = (name: string = 'Guest User') => {
    const mock = {
      uid: 'guest_user_id',
      email: 'guest@sparringpartner.ai',
      displayName: name,
    } as any;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_user', JSON.stringify(mock));
    }
    setUser(mock);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, loginAsMock }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
