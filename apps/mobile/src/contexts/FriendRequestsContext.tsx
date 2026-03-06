import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getIncomingPendingCount } from '../lib/friendRequests';
import { getPendingSplitRequestsCount } from '../lib/splitFriendRequests';

type FriendRequestsState = {
  pendingIncomingCount: number;
  pendingSplitCount: number;
  refreshPendingCount: () => Promise<void>;
};

const FriendRequestsContext = createContext<FriendRequestsState | null>(null);

export function useFriendRequests() {
  const ctx = useContext(FriendRequestsContext);
  if (!ctx) throw new Error('useFriendRequests must be used within FriendRequestsProvider');
  return ctx;
}

export function FriendRequestsProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);
  const [pendingSplitCount, setPendingSplitCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const [friendCount, splitCount] = await Promise.all([
        getIncomingPendingCount(),
        getPendingSplitRequestsCount(),
      ]);
      setPendingIncomingCount(friendCount);
      setPendingSplitCount(splitCount);
    } catch {
      setPendingIncomingCount(0);
      setPendingSplitCount(0);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setPendingIncomingCount(0);
      setPendingSplitCount(0);
      return;
    }
    refreshPendingCount();
  }, [userId, refreshPendingCount]);

  const value: FriendRequestsState = {
    pendingIncomingCount,
    pendingSplitCount,
    refreshPendingCount,
  };

  return (
    <FriendRequestsContext.Provider value={value}>
      {children}
    </FriendRequestsContext.Provider>
  );
}
