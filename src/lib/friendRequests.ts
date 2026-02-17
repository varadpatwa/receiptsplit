import { supabase } from './supabaseClient';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  created_at: string;
  from_profile?: {
    handle: string;
    display_name: string | null;
  };
  to_profile?: {
    handle: string;
    display_name: string | null;
  };
}

/**
 * Get incoming friend requests (to current user)
 */
export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      from_profile:profiles!friend_requests_from_user_id_fkey(handle, display_name)
    `)
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get incoming requests:', error);
    throw new Error(`Failed to load requests: ${error.message}`);
  }

  return data || [];
}

/**
 * Get outgoing friend requests (from current user)
 */
export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      to_profile:profiles!friend_requests_to_user_id_fkey(handle, display_name)
    `)
    .eq('from_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get outgoing requests:', error);
    throw new Error(`Failed to load requests: ${error.message}`);
  }

  return data || [];
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(toUserId: string): Promise<FriendRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  if (user.id === toUserId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if request already exists
  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id, status')
    .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'pending') {
      throw new Error('Friend request already exists');
    }
    if (existing.status === 'accepted') {
      throw new Error('Already friends');
    }
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to send friend request:', error);
    throw new Error(`Failed to send request: ${error.message}`);
  }

  return data;
}

/**
 * Accept a friend request (uses RPC)
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_friend_request', {
    req_id: requestId,
  });

  if (error) {
    console.error('Failed to accept friend request:', error);
    throw new Error(`Failed to accept request: ${error.message}`);
  }
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) {
    console.error('Failed to reject friend request:', error);
    throw new Error(`Failed to reject request: ${error.message}`);
  }
}
