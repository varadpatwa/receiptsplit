import type { Split, Participant } from '@receiptsplit/shared';
import { calculateBreakdown } from '@receiptsplit/shared';
import { supabase } from './supabase';

const ME_ID = 'me';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(s: string): boolean {
  return typeof s === 'string' && UUID_REGEX.test(s);
}

export type SplitFriendRequestStatus = 'pending' | 'confirmed' | 'rejected';

export interface SplitFriendRequestRow {
  split_id: string;
  friend_user_id: string;
  status: SplitFriendRequestStatus;
  share_amount: number;
  created_at: string;
}

export interface PendingSplitRequest {
  split_id: string;
  friend_user_id: string;
  status: SplitFriendRequestStatus;
  share_amount: number;
  created_at: string;
  split_title: string;
  split_created_at: string;
  owner_handle: string | null;
}

/**
 * Fetch pending split_friend_requests for the current user (receiver), with split title/date and owner handle.
 */
export async function getPendingSplitRequests(): Promise<PendingSplitRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('split_friend_requests')
    .select(`
      split_id,
      friend_user_id,
      status,
      share_amount,
      created_at,
      split:splits(title, created_at, user_id)
    `)
    .eq('friend_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load split requests: ${error.message}`);
  if (!data || data.length === 0) return [];

  const ownerIds = [...new Set((data as any[]).map((r) => r.split?.user_id).filter(Boolean))] as string[];
  let ownerHandles: Map<string, string | null> = new Map();
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle')
      .in('id', ownerIds);
    if (profiles) {
      profiles.forEach((p: { id: string; handle: string | null }) => ownerHandles.set(p.id, p.handle));
    }
  }

  return (data as any[]).map((r) => ({
    split_id: r.split_id,
    friend_user_id: r.friend_user_id,
    status: r.status,
    share_amount: Number(r.share_amount),
    created_at: r.created_at,
    split_title: r.split?.title ?? 'Split',
    split_created_at: r.split?.created_at ?? r.created_at,
    owner_handle: r.split?.user_id ? (ownerHandles.get(r.split.user_id) ?? null) : null,
  }));
}

/**
 * Count of pending split_friend_requests for the current user (for badge).
 */
export async function getPendingSplitRequestsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from('split_friend_requests')
    .select('*', { count: 'exact', head: true })
    .eq('friend_user_id', user.id)
    .eq('status', 'pending');
  if (error) throw new Error(`Failed to load split request count: ${error.message}`);
  return count ?? 0;
}

/**
 * Confirm (accept) a split request. Receiver only.
 */
export async function confirmSplitRequest(splitId: string, _friendUserId: string): Promise<void> {
  const { error } = await supabase
    .from('split_friend_requests')
    .update({ status: 'confirmed' })
    .eq('split_id', splitId)
    .eq('friend_user_id', _friendUserId);
  if (error) throw new Error(`Failed to confirm: ${error.message}`);
}

/**
 * Reject a split request. Receiver only.
 */
export async function rejectSplitRequest(splitId: string, _friendUserId: string): Promise<void> {
  const { error } = await supabase
    .from('split_friend_requests')
    .update({ status: 'rejected' })
    .eq('split_id', splitId)
    .eq('friend_user_id', _friendUserId);
  if (error) throw new Error(`Failed to reject: ${error.message}`);
}

/**
 * Upsert split_friend_requests for friend participants only. Call after create/update split.
 * Only runs when the current auth user is the split owner (splits.user_id); otherwise skips and logs.
 * Share amounts are computed from breakdown (grandTotal in cents). Temp participants are skipped.
 */
export async function upsertFriendRequestsForSplit(split: Split): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (__DEV__) {
    console.log('[splitFriendRequests] current auth user id', user.id);
  }

  const { data: splitRow, error: fetchError } = await supabase
    .from('splits')
    .select('user_id')
    .eq('id', split.id)
    .maybeSingle();

  if (fetchError || !splitRow) {
    if (__DEV__) {
      console.warn('[splitFriendRequests] could not fetch split ownership', { split_id: split.id, error: fetchError?.message });
    }
    return;
  }

  const splitOwnerId = (splitRow as { user_id: string }).user_id;
  if (splitOwnerId !== user.id) {
    if (__DEV__) {
      console.warn('[splitFriendRequests] skip upsert: current user is not split owner', {
        current_user_id: user.id,
        split_user_id: splitOwnerId,
        split_id: split.id,
      });
    }
    return;
  }

  const breakdowns = calculateBreakdown(split);
  const byParticipantId = new Map(breakdowns.map((b) => [b.participantId, b.grandTotal]));

  const friendParticipants = split.participants.filter(
    (p: Participant) =>
      p.id !== ME_ID &&
      (p.source === 'friend' || isValidUuid(p.id)) &&
      isValidUuid(p.id)
  );

  if (__DEV__) {
    console.log('[splitFriendRequests] upsertFriendRequestsForSplit', {
      split_id: split.id,
      friendParticipantIds: friendParticipants.map((p) => ({ id: p.id, name: p.name, source: p.source })),
      participantCount: split.participants.length,
    });
  }

  if (friendParticipants.length === 0) return;

  for (const p of friendParticipants) {
    const shareAmount = byParticipantId.get(p.id) ?? 0;
    if (__DEV__) {
      console.log('[splitFriendRequests] RPC upsert_split_friend_request', {
        p_split_id: split.id,
        p_friend_user_id: p.id,
        p_share_amount: shareAmount,
        p_status: 'pending',
      });
    }
    const { error } = await supabase.rpc('upsert_split_friend_request', {
      p_split_id: split.id,
      p_friend_user_id: p.id,
      p_share_amount: shareAmount,
      p_status: 'pending',
    });
    if (error) {
      if (__DEV__) {
        console.warn('[splitFriendRequests] RPC error', error.message, { split_id: split.id, friend_user_id: p.id });
      }
      throw new Error(`Failed to save split request: ${error.message}`);
    }
  }

  if (__DEV__) {
    console.log('[splitFriendRequests] RPC upsert ok', { rowCount: friendParticipants.length });
  }
}

/**
 * Get total confirmed share_amount (cents) for the current user (for spending).
 */
export async function getConfirmedShareAmountCents(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase
    .from('split_friend_requests')
    .select('share_amount')
    .eq('friend_user_id', user.id)
    .eq('status', 'confirmed');
  if (error) throw new Error(`Failed to load confirmed shares: ${error.message}`);
  if (!data || data.length === 0) return 0;
  const sum = (data as { share_amount: number }[]).reduce((acc, r) => acc + Number(r.share_amount), 0);
  return Math.round(sum);
}

/** share_amount in public.split_friend_requests is stored in cents (e.g. 2500 = $25.00). */

function getNextMonthStart(monthStartMs: number): number {
  const d = new Date(monthStartMs);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Fetch confirmed friend shares (no join). Optional month filter: created_at >= monthStartMs and < nextMonthStart.
 */
export interface ConfirmedFriendSharesRaw {
  authUid: string | null;
  rowCount: number;
  totalCents: number;
}

export async function getConfirmedFriendSharesRaw(monthStartMs?: number): Promise<ConfirmedFriendSharesRaw> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authUid: null, rowCount: 0, totalCents: 0 };
  let query = supabase
    .from('split_friend_requests')
    .select('share_amount, created_at')
    .eq('friend_user_id', user.id)
    .eq('status', 'confirmed');
  if (monthStartMs != null && monthStartMs > 0) {
    const nextStart = getNextMonthStart(monthStartMs);
    query = query
      .gte('created_at', new Date(monthStartMs).toISOString())
      .lt('created_at', new Date(nextStart).toISOString());
  }
  const { data: rows, error } = await query;
  if (error) throw new Error(`Failed to load confirmed shares: ${error.message}`);
  const list = rows ?? [];
  const totalCents = list.reduce((sum, r) => sum + Math.round(Number((r as { share_amount: number }).share_amount)), 0);
  return { authUid: user.id, rowCount: list.length, totalCents };
}

/**
 * Confirmed share totals for the current user for the given month, with category breakdown.
 * Filters by split_friend_requests.created_at >= monthStartMs and < nextMonthStart.
 * Category comes from joins to splits when available; otherwise "Shared".
 */
export interface ConfirmedSharesForMonth {
  totalCents: number;
  categoryCents: Array<{ category: string; cents: number }>;
  rowCount: number;
  excludedByMonthFilter?: number;
}

export async function getConfirmedSharesForMonth(monthStartMs: number): Promise<ConfirmedSharesForMonth> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalCents: 0, categoryCents: [], rowCount: 0 };
  const nextMonthStartMs = getNextMonthStart(monthStartMs);
  const monthStartIso = new Date(monthStartMs).toISOString();
  const nextMonthStartIso = new Date(nextMonthStartMs).toISOString();
  const { data: rows, error } = await supabase
    .from('split_friend_requests')
    .select('split_id, share_amount, created_at, split:splits(split_data)')
    .eq('friend_user_id', user.id)
    .eq('status', 'confirmed')
    .gte('created_at', monthStartIso)
    .lt('created_at', nextMonthStartIso);
  if (error) throw new Error(`Failed to load confirmed shares: ${error.message}`);
  const list = rows ?? [];
  if (list.length === 0) return { totalCents: 0, categoryCents: [], rowCount: 0 };
  const byCategory = new Map<string, number>();
  let totalCents = 0;
  const SHARED_LABEL = 'Shared';
  for (const r of list as any[]) {
    const cents = Math.round(Number(r.share_amount));
    totalCents += cents;
    const category =
      (r.split?.split_data?.category as string) ?? (r.split?.category as string) ?? SHARED_LABEL;
    byCategory.set(category, (byCategory.get(category) ?? 0) + cents);
  }
  const categoryCents = Array.from(byCategory.entries())
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents);
  if (__DEV__) {
    console.log('[splitFriendRequests] getConfirmedSharesForMonth', { monthStartMs, rowCount: list.length, totalCents });
  }
  return { totalCents, categoryCents, rowCount: list.length };
}

/**
 * Get total confirmed share_amount (cents) for the current user for splits within the given month.
 * @deprecated Prefer getConfirmedSharesForMonth for spending UI (includes category).
 */
export async function getConfirmedShareAmountCentsForMonth(monthStartMs: number): Promise<number> {
  const { totalCents } = await getConfirmedSharesForMonth(monthStartMs);
  return totalCents;
}
