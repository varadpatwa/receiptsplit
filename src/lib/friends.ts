import { supabase } from './supabaseClient';

export interface Friend {
  id: string;
  name: string;
}

/**
 * Convert database row to Friend
 */
function rowToFriend(row: { id: string; name: string; created_at: string }): Friend {
  return {
    id: row.id,
    name: row.name,
  };
}

/**
 * List all friends for the current user.
 * Requires an active session - user_id is derived from auth.uid() via RLS.
 */
export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to list friends:', error);
    throw new Error(`Failed to load friends: ${error.message}`);
  }
  
  if (!data) return [];
  
  return data.map(rowToFriend);
}

/**
 * Create a new friend.
 * user_id is automatically set by RLS from auth.uid().
 * Trims whitespace and checks for duplicates case-insensitively.
 */
export async function createFriend(name: string): Promise<Friend> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Friend name cannot be empty');
  }
  
  // Check for existing friend with same name (case-insensitive)
  const existing = await listFriends();
  const lower = trimmed.toLowerCase();
  const duplicate = existing.find(f => f.name.toLowerCase() === lower);
  if (duplicate) {
    return duplicate;
  }
  
  const { data, error } = await supabase
    .from('friends')
    .insert({
      name: trimmed,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create friend:', error);
    throw new Error(`Failed to create friend: ${error.message}`);
  }
  
  return rowToFriend(data);
}

/**
 * Update an existing friend.
 * Only updates friends owned by the current user (enforced by RLS).
 */
export async function updateFriend(friend: Friend): Promise<Friend> {
  const trimmed = friend.name.trim();
  if (!trimmed) {
    throw new Error('Friend name cannot be empty');
  }
  
  const { data, error } = await supabase
    .from('friends')
    .update({
      name: trimmed,
    })
    .eq('id', friend.id)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to update friend:', error);
    throw new Error(`Failed to update friend: ${error.message}`);
  }
  
  return rowToFriend(data);
}

/**
 * Delete a friend.
 * Only deletes friends owned by the current user (enforced by RLS).
 */
export async function deleteFriend(friendId: string): Promise<void> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendId);
  
  if (error) {
    console.error('Failed to delete friend:', error);
    throw new Error(`Failed to delete friend: ${error.message}`);
  }
}

/**
 * Get friend by name (case-insensitive). Returns undefined if not found.
 */
export async function getFriendByName(name: string): Promise<Friend | undefined> {
  const trimmed = name.trim().toLowerCase();
  const friends = await listFriends();
  return friends.find(f => f.name.toLowerCase() === trimmed);
}
