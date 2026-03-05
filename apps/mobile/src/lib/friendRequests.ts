import { supabase } from './supabase';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  created_at: string;
  from_profile?: { handle: string; display_name: string | null };
  to_profile?: { handle: string; display_name: string | null };
}

/**
 * Returns the count of pending incoming friend requests (to_user_id = auth.uid(), status = 'pending').
 * Uses count-only query; does not download rows.
 */
export async function getIncomingPendingCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from('friend_requests')
    .select('*', { count: 'exact', head: true })
    .eq('to_user_id', user.id)
    .eq('status', 'pending');
  if (error) {
    throw new Error(`Failed to load pending count: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Incoming: to_user_id = current user, status = pending, with sender profile (handle, display_name).
 * Ordered by created_at desc. RLS must allow SELECT where to_user_id = auth.uid().
 */
export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*, from_profile:profiles!friend_requests_from_user_id_fkey(handle, display_name)')
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Failed to load incoming requests: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Outgoing: from_user_id = current user, status = pending, with recipient profile.
 * Ordered by created_at desc.
 */
export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*, to_profile:profiles!friend_requests_to_user_id_fkey(handle, display_name)')
    .eq('from_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Failed to load outgoing requests: ${error.message}`);
  }
  return data ?? [];
}

export async function sendFriendRequest(toUserId: string): Promise<FriendRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  if (user.id === toUserId) throw new Error('Cannot send friend request to yourself');
  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id, status')
    .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
    .maybeSingle();
  if (existing) {
    if (existing.status === 'pending') throw new Error('Friend request already exists');
    if (existing.status === 'accepted') throw new Error('Already friends');
  }
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({ from_user_id: user.id, to_user_id: toUserId, status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(`Failed to send request: ${error.message}`);
  return data;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_friend_request', { req_id: requestId });
  if (error) throw new Error(`Failed to accept request: ${error.message}`);
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);
  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`);
  }
}
