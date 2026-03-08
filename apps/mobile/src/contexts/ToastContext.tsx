import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, type ToastConfig } from '../components/Toast';

interface ToastContextValue {
  showToast: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ToastConfig | null>(null);

  const showToast = useCallback((c: ToastConfig) => {
    setConfig(null);
    // Small delay to reset animation state if replacing a toast
    setTimeout(() => setConfig(c), 50);
  }, []);

  const handleDismiss = useCallback(() => setConfig(null), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast config={config} onDismiss={handleDismiss} />
    </ToastContext.Provider>
  );
}
