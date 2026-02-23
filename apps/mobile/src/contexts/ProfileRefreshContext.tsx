import React, { createContext, useContext } from 'react';

type ProfileRefreshContextType = {
  refreshProfile: () => Promise<void>;
};

const ProfileRefreshContext = createContext<ProfileRefreshContextType | null>(null);

export function useProfileRefresh() {
  const ctx = useContext(ProfileRefreshContext);
  return ctx;
}

export function ProfileRefreshProvider({
  children,
  refreshProfile,
}: {
  children: React.ReactNode;
  refreshProfile: () => Promise<void>;
}) {
  return (
    <ProfileRefreshContext.Provider value={{ refreshProfile }}>
      {children}
    </ProfileRefreshContext.Provider>
  );
}
