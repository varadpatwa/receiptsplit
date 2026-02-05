import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#141416] p-5 shadow-sm backdrop-blur-sm ${
        onClick ? 'cursor-pointer transition-all hover:border-white/20' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
