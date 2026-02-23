import { supabase } from './supabase';

export interface Friend {
  id: string;
  handle: string;
  display_name: string | null;
}

export async function listFriends(): Promise<Friend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id, friend_profile:profiles!friendships_friend_id_fkey(handle, display_name)')
    .eq('user_id', user.id);
  if (error) throw new Error(`Failed to load friends: ${error.message}`);
  if (!data) return [];
  return data
    .filter((row: any) => row.friend_profile)
    .map((row: any) => ({
      id: row.friend_id,
      handle: row.friend_profile.handle,
      display_name: row.friend_profile.display_name,
    }));
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
