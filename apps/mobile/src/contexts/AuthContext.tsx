import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  userId: string | null;
  email: string | null;
  sessionLoaded: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  userId: null,
  email: null,
  sessionLoaded: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setSessionLoaded(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    user,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    sessionLoaded,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
