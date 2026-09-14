'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/lib/types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default demo user for instant viva demonstration
const DEFAULT_DEMO_USER: User = {
  user_id: '11111111-1111-1111-1111-111111111111',
  name: 'Parth Sharma',
  email: 'parth@example.com',
  number: '9876543210'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rideshare_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      } else {
        // Automatically default to Parth Sharma for smooth demo
        setCurrentUser(DEFAULT_DEMO_USER);
        localStorage.setItem('rideshare_user', JSON.stringify(DEFAULT_DEMO_USER));
      }
    } catch {
      setCurrentUser(DEFAULT_DEMO_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSetUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('rideshare_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rideshare_user');
    }
  };

  const logout = () => {
    handleSetUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetUser,
        isLoading,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
