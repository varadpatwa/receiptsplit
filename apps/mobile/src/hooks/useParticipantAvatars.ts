import { useState, useEffect, useMemo } from 'react';
import type { Participant } from '@receiptsplit/shared';
import { listFriends, type Friend } from '../lib/friends';
import { getProfile, getAvatarPublicUrl, type Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Resolves avatar URLs for a list of participants.
 * Fetches friends list and current user profile, then maps participant IDs
 * to their public avatar URLs (or null for temp/no-avatar participants).
 */
export function useParticipantAvatars(participants: Participant[]): Map<string, string | null> {
  const { userId } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFriends()
      .then((f) => { if (!cancelled) setFriends(f); })
      .catch(() => {});
    getProfile()
      .then((p) => { if (!cancelled) setMyProfile(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  return useMemo(() => {
    const friendMap = new Map(friends.map((f) => [f.id, f.avatar_url]));
    const map = new Map<string, string | null>();
    for (const p of participants) {
      if (p.id === 'me') {
        map.set(p.id, myProfile?.avatar_url ? getAvatarPublicUrl(myProfile.avatar_url) : null);
      } else if (p.source === 'friend') {
        const path = friendMap.get(p.id);
        map.set(p.id, path ? getAvatarPublicUrl(path) : null);
      } else {
        map.set(p.id, null);
      }
    }
    return map;
  }, [participants, friends, myProfile]);
}
