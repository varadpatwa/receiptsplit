import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { AUTH_HOME } from '@/constants/routes';

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

export const SignupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (session) {
      navigate(AUTH_HOME, { replace: true });
    }
  }, [session, navigate]);

  // Check for existing session on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(AUTH_HOME, { replace: true });
    });
  }, [navigate]);

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Sign up</h1>
          <p className="text-white/60">Create an account to get started.</p>
        </div>

        <Card className="space-y-4 p-6">
          {emailConfirmationSent ? (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-blue-400">Check your email to confirm your account.</p>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
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
              <Button type="submit" disabled={loading || !email || !password} className="w-full">
                {loading ? 'Signing up...' : 'Sign up'}
              </Button>
            </form>
          )}
        </Card>

        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-white/60 hover:text-white/80 text-sm transition-colors"
          >
            Already have an account? Log in
          </button>
        </div>
      </div>
    </Layout>
  );
};
