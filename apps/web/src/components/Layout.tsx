import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0B0B0C] px-5 py-6 relative">
      {/* Subtle radial gradient for depth */}
      <div className="fixed inset-0 bg-gradient-radial from-white/[0.03] via-transparent to-transparent pointer-events-none" />
      
      <div className="mx-auto max-w-[420px] md:max-w-[560px] relative z-10">
        {children}
      </div>
    </div>
  );
};
