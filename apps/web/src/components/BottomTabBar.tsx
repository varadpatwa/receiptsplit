import React from 'react';
import { Home, Wallet, Users, User } from 'lucide-react';

export type TabId = 'home' | 'spending' | 'friends' | 'account';

interface BottomTabBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-6 w-6" /> },
  { id: 'spending', label: 'Spending', icon: <Wallet className="h-6 w-6" /> },
  { id: 'friends', label: 'Friends', icon: <Users className="h-6 w-6" /> },
  { id: 'account', label: 'Account', icon: <User className="h-6 w-6" /> },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0B0B0C]/95 backdrop-blur-md safe-area-pb"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="mx-auto flex max-w-[420px] md:max-w-[560px] items-center justify-around px-2 py-2">
        {tabs.map(({ id, label, icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors min-w-[64px]"
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={
                  isActive
                    ? 'text-white'
                    : 'text-white/50'
                }
              >
                {icon}
              </span>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
