import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { listSplits } from '@/lib/splits';
import { listFriends } from '@/lib/friends';
import { AUTH_LANDING } from '@/constants/routes';

/** Normalize any error to a user-facing string. Avoids showing "{}" or [object Object]. */
function toErrorString(e: unknown): string {
  if (typeof e === 'string' && e.trim()) return e.trim();
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim() && msg !== '{}') return msg.trim();
  }
  if (e instanceof Error && e.message) return e.message;
  return 'Something went wrong. Please try again.';
}

const SIGNUP_TIMEOUT_MS = 20_000;

export const AccountScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setEmailConfirmationSent(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setLoading(true);
    setError(null);
    setEmailConfirmationSent(false);
    try {
      const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Check your connection and try again.')), SIGNUP_TIMEOUT_MS)
      );
      const { error } = await Promise.race([signUpPromise, timeoutPromise]);
      if (error) {
        setError(toErrorString(error));
      } else {
        setEmailConfirmationSent(true);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(toErrorString(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(toErrorString(error));
      else {
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(toErrorString(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(toErrorString(error));
      } else {
        // Navigate to welcome screen after sign out
        navigate(AUTH_LANDING, { replace: true });
      }
    } catch (err) {
      setError(toErrorString(err));
    } finally {
      setLoading(false);
    }
  };

  const hasEnvVars = isSupabaseConfigured();
  const auth = useAuth();
  const [splitsCount, setSplitsCount] = useState<number>(0);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  
  // Load counts from Supabase
  useEffect(() => {
    const loadCounts = async () => {
      if (!auth.userId || !hasEnvVars) {
        setSplitsCount(0);
        setFriendsCount(0);
        return;
      }
      
      try {
        const splits = await listSplits();
        const friends = await listFriends();
        setSplitsCount(splits.length);
        setFriendsCount(friends.length);
      } catch (error) {
        console.error('Failed to load counts:', error);
        setSplitsCount(0);
        setFriendsCount(0);
      }
    };
    
    loadCounts();
  }, [auth.userId, hasEnvVars]);

  return (
    <Layout>
      <div className="space-y-6 pb-24">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Account</h1>
          <p className="text-white/60">Sign in and manage your data.</p>
        </div>

        {!hasEnvVars && (
          <Card className="space-y-2 p-4 border-yellow-500/30 bg-yellow-500/10">
            <p className="text-yellow-400 text-sm font-medium">Supabase not configured</p>
            <p className="text-yellow-400/80 text-xs">
              Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
            </p>
          </Card>
        )}

        {session && user ? (
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-white">Signed in</h2>
            <p className="text-white/80"><span className="font-medium">Email:</span> {user.email}</p>
            <Button onClick={handleSignOut} disabled={loading} variant="secondary" className="w-full">
              {loading ? 'Signing out...' : 'Sign out'}
            </Button>
          </Card>
        ) : (
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-white">
              {emailConfirmationSent ? 'Check your email' : 'Sign in / Sign up'}
            </h2>
            {emailConfirmationSent ? (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="text-blue-400">Check your email to confirm your account.</p>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <Input
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                {error && typeof error === 'string' && error.trim() && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-red-400 text-sm">{String(error).trim()}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading || !email || !password} className="flex-1">
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSignUp}
                    disabled={loading || !email || !password}
                    variant="secondary"
                    className="flex-1"
                  >
                    {loading ? 'Signing up...' : 'Sign up'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        <Card className="space-y-2 p-4">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="w-full text-left text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            {showDebug ? '▼' : '▶'} Debug Info
          </button>
          {showDebug && (
            <div className="space-y-2 pt-2 text-xs text-white/60 font-mono">
              <div>
                <span className="text-white/80">Env vars present:</span>{' '}
                <span className={hasEnvVars ? 'text-green-400' : 'text-red-400'}>
                  {hasEnvVars ? 'true' : 'false'}
                </span>
              </div>
              <div>
                <span className="text-white/80">Session exists:</span>{' '}
                <span className={session ? 'text-green-400' : 'text-red-400'}>
                  {session ? 'true' : 'false'}
                </span>
              </div>
              <div>
                <span className="text-white/80">User id:</span>{' '}
                <span className="text-white/90 break-all">{auth.userId ?? '—'}</span>
              </div>
              <div>
                <span className="text-white/80">Email:</span>{' '}
                <span className="text-white/90 break-all">{auth.email ?? '—'}</span>
              </div>
              <div>
                <span className="text-white/80">Splits count:</span>{' '}
                <span className="text-white/90">{splitsCount}</span>
              </div>
              <div>
                <span className="text-white/80">Friends count:</span>{' '}
                <span className="text-white/90">{friendsCount}</span>
              </div>
              {import.meta.env.VITE_SUPABASE_URL && (
                <div className="break-all">
                  <span className="text-white/80">URL:</span>{' '}
                  {import.meta.env.VITE_SUPABASE_URL.substring(0, 30)}...
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};
