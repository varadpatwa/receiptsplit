import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

/**
 * Handles redirect from Supabase email confirmation (e.g. Brevo SMTP).
 * Supports hash fragment (access_token, refresh_token) and PKCE code in query.
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      return;
    }

    const run = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const queryParams = new URLSearchParams(window.location.search);

        // PKCE: code in query (e.g. after email confirm redirect from Supabase)
        const code = queryParams.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
          if (data.session) {
            navigate('/', { replace: true });
            return;
          }
        }

        // Implicit / hash: access_token and refresh_token in hash
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: setError_ } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setError_) {
            setError(setError_.message);
            return;
          }
          navigate('/', { replace: true });
          return;
        }

        // No tokens: maybe already restored by client
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/', { replace: true });
          return;
        }

        setError('Could not complete sign in. The link may have expired.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    };

    run();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center p-6">
        <p className="text-red-400 text-center mb-4">{error}</p>
        <a href="/" className="text-white/80 underline">Return home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center p-6">
      <p className="text-white/80">Confirming your account…</p>
    </div>
  );
};
