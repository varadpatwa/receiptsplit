import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { AUTH_HOME } from '@/constants/routes';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  // Redirect if already signed in
  useEffect(() => {
    if (session) {
      navigate(AUTH_HOME, { replace: true });
    }
  }, [session, navigate]);

  // Show welcome screen immediately, redirect happens in useEffect
  return (
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center px-5 relative">
      {/* Subtle radial gradient for depth (matching Layout component) */}
      <div className="fixed inset-0 bg-gradient-radial from-white/[0.03] via-transparent to-transparent pointer-events-none" />
      
      <div className="flex-1 flex items-center justify-center relative z-10">
        <h1 className="text-6xl md:text-7xl font-semibold text-white tracking-tight">
          receiptsplit
        </h1>
      </div>
      
      <div className="w-full max-w-[420px] pb-12 space-y-4 relative z-10">
        <Button
          onClick={() => navigate('/signup')}
          className="w-full"
          variant="primary"
        >
          SIGN UP FOR FREE
        </Button>
        
        <button
          onClick={() => navigate('/login')}
          className="w-full text-white/80 font-semibold py-3.5 text-center hover:text-white transition-colors"
        >
          LOG IN
        </button>
      </div>
    </div>
  );
};
