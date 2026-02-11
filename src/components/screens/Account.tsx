import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export const AccountScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Check initial session and listen for auth changes
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setEmailConfirmationSent(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      return;
    }

    setLoading(true);
    setError(null);
    setEmailConfirmationSent(false);

    try {
      const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setError(error.message);
      } else {
        setEmailConfirmationSent(true);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
        setError(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const hasEnvVars = isSupabaseConfigured();

  return (
    <Layout>
      <div className="space-y-6 pb-24">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Account
          </h1>
          <p className="text-white/60">
            Sign in and manage your data.
          </p>
        </div>

        {!hasEnvVars && (
          <Card className="space-y-2 p-4 border-yellow-500/30 bg-yellow-500/10">
            <p className="text-yellow-400 text-sm font-medium">
              ⚠️ Supabase not configured
            </p>
            <p className="text-yellow-400/80 text-xs">
              Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
            </p>
          </Card>
        )}

        {session && user ? (
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-white">Signed in</h2>
            <div className="space-y-2">
              <p className="text-white/80">
                <span className="font-medium">Email:</span> {user.email}
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
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
                <p className="text-blue-400">
                  Check your email to confirm your account.
                </p>
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

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="flex-1"
                  >
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

        {/* Debug Section */}
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
