import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/lib/profiles';
import App from '@/App';
import { AUTH_LANDING } from '@/constants/routes';

export const ProtectedApp: React.FC = () => {
  const navigate = useNavigate();
  const { session, userId } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!session || !userId) {
        navigate(AUTH_LANDING, { replace: true });
        return;
      }

      try {
        const profile = await getProfile();
        if (!profile || !profile.handle) {
          // No profile or missing handle, redirect to onboarding
          navigate('/onboarding/username', { replace: true });
        } else {
          setHasProfile(true);
        }
      } catch (error) {
        console.error('Failed to check profile:', error);
        // On error, allow access (don't block user)
        setHasProfile(true);
      } finally {
        setChecking(false);
      }
    };

    checkProfile();
  }, [session, userId, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  if (!hasProfile) {
    return null; // Redirecting to onboarding
  }

  return <App />;
};
