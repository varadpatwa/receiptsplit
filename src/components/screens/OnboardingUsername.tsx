import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { upsertProfile, validateHandle, isHandleAvailable } from '@/lib/profiles';
import { AUTH_HOME } from '@/constants/routes';

export const OnboardingUsernameScreen: React.FC = () => {
  const navigate = useNavigate();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Validate handle format
  const handleValidation = validateHandle(handle);
  const isValidFormat = handleValidation.valid;

  // Check availability when handle changes (debounced)
  useEffect(() => {
    if (!handle.trim() || !isValidFormat) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const available = await isHandleAvailable(handle);
        if (!available) {
          setError('This handle is already taken');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Failed to check handle availability:', err);
        // Don't set error here, let submit handle it
      } finally {
        setCheckingAvailability(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [handle, isValidFormat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidFormat) {
      setError(handleValidation.error || 'Invalid handle format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Final availability check
      const available = await isHandleAvailable(handle);
      if (!available) {
        setError('This handle is already taken');
        setLoading(false);
        return;
      }

      await upsertProfile(handle, displayName || undefined);
      navigate(AUTH_HOME, { replace: true });
    } catch (err) {
      console.error('Failed to create profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Choose your handle
          </h1>
          <p className="text-white/60">
            Your handle is how others will find and mention you.
          </p>
        </div>

        <Card className="space-y-4 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                label="Handle"
                placeholder="username"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value.toLowerCase());
                  setError(null);
                }}
                disabled={loading}
                required
                className="font-mono"
              />
              <div className="space-y-1">
                {handle && !isValidFormat && (
                  <p className="text-sm text-red-400">{handleValidation.error}</p>
                )}
                {checkingAvailability && (
                  <p className="text-sm text-white/60">Checking availability...</p>
                )}
                <p className="text-xs text-white/60">
                  3-20 characters, lowercase letters, numbers, and underscores only
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                label="Display Name (optional)"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-white/60">
                This is how your name appears to others
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !isValidFormat || checkingAvailability || !!error}
              className="w-full"
            >
              {loading ? 'Creating profile...' : 'Continue'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
};
