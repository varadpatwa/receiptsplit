import { supabase } from './supabase';

export interface Friend {
  id: string;
  handle: string;
  display_name: string | null;
}

/**
 * List all friends for the current user.
 * Two-step: (1) friendships where user_id = auth.uid() → friend_id;
 * (2) profiles where id IN (friend_ids) → id, handle, display_name.
 * No embedded join to avoid schema/RLS issues with relationship cache.
 */
export async function listFriends(): Promise<Friend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: friendshipRows, error: friendshipError } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', user.id);

  if (friendshipError) {
    throw new Error(`Failed to load friends: ${friendshipError.message}`);
  }
  if (!friendshipRows || friendshipRows.length === 0) {
    return [];
  }

  const friendIds = friendshipRows.map((row: { friend_id: string }) => row.friend_id);

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, handle, display_name')
    .in('id', friendIds);

  if (profileError) {
    throw new Error(`Failed to load friend profiles: ${profileError.message}`);
  }

  const profiles = (profileRows ?? []) as Array<{ id: string; handle: string; display_name: string | null }>;
  if (friendIds.length > 0 && profiles.length === 0) {
    if (__DEV__) {
      console.warn(
        'listFriends: friendships has rows but profiles returned empty (check RLS or profiles table)',
        { friendIds }
      );
    }
  }

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const friends: Friend[] = friendIds
    .map((id) => {
      const p = byId.get(id);
      if (!p) return null;
      return { id: p.id, handle: p.handle, display_name: p.display_name };
    })
    .filter((f): f is Friend => f !== null);

  friends.sort((a, b) => a.handle.localeCompare(b.handle, 'en', { sensitivity: 'base' }));
  return friends;
}

export async function deleteFriend(friendId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
  if (error) throw new Error(`Failed to remove friend: ${error.message}`);
}

export async function getFriendByHandle(handle: string): Promise<Friend | undefined> {
  const trimmed = handle.trim().toLowerCase();
  const friends = await listFriends();
  return friends.find((f) => f.handle.toLowerCase() === trimmed);
}
