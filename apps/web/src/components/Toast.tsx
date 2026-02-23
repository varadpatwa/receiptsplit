import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, visible, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-5 animate-slide-up">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141416]/95 px-5 py-4 shadow-lg backdrop-blur-md">
        <Check className="h-5 w-5 text-green-400" />
        <span className="font-medium text-white">{message}</span>
      </div>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState({ visible: false, message: '' });
  
  const showToast = (message: string) => {
    setToast({ visible: true, message });
  };
  
  const hideToast = () => {
    setToast({ visible: false, message: '' });
  };
  
  return { toast, showToast, hideToast };
};
