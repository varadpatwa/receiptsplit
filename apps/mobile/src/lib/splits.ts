import type { Split, Participant } from '@receiptsplit/shared';
import { generateAutoTitle } from '@receiptsplit/shared';
import { supabase } from './supabase';
import { upsertFriendRequestsForSplit } from './splitFriendRequests';

const ME_PARTICIPANT_ID = 'me';
const ME_PARTICIPANT_NAME = 'Me';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(s: string): boolean {
  return typeof s === 'string' && UUID_REGEX.test(s);
}

function normalizeSplit(split: Split): Split {
  const excludeMe = split.excludeMe ?? false;
  const hasMe = split.participants.some((p) => p.id === ME_PARTICIPANT_ID);
  let participants = [...split.participants];
  if (!excludeMe && !hasMe) {
    participants = [{ id: ME_PARTICIPANT_ID, name: ME_PARTICIPANT_NAME }, ...participants];
  } else if (excludeMe && hasMe) {
    participants = participants.filter((p) => p.id !== ME_PARTICIPANT_ID);
  }
  return { ...split, excludeMe, participants };
}

function calculateTotal(split: Split): number {
  const itemsTotal = split.items.reduce(
    (sum, item) => sum + (Number(item.priceInCents) || 0) * (Number(item.quantity) || 0),
    0
  );
  const total = itemsTotal + (Number(split.taxInCents) || 0) + (Number(split.tipInCents) || 0);
  return Number.isFinite(total) ? Math.round(total) : 0;
}

function splitToRow(split: Split): {
  id: string;
  title: string;
  total: number;
  exclude_me: boolean;
  receipt_image_path: string | null;
  participants: Participant[];
  created_at: string;
  split_data: Record<string, unknown>;
} {
  const normalized = normalizeSplit(split);
  const total = Math.round(Number(calculateTotal(normalized)) || 0);
  const title = (normalized.name?.trim() || `Split ${new Date(normalized.createdAt).toLocaleDateString()}`).slice(0, 512);
  const createdAt = Number(normalized.createdAt);
  const created_at = Number.isFinite(createdAt) ? new Date(createdAt).toISOString() : new Date().toISOString();
  const participants = Array.isArray(normalized.participants) ? normalized.participants : [];
  return {
    id: normalized.id,
    title,
    total,
    exclude_me: Boolean(normalized.excludeMe),
    receipt_image_path: normalized.receiptImagePath ?? null,
    participants,
    created_at,
    split_data: {
      items: normalized.items ?? [],
      taxInCents: normalized.taxInCents ?? 0,
      tipInCents: normalized.tipInCents ?? 0,
      currentStep: normalized.currentStep ?? 'receipt',
      updatedAt: normalized.updatedAt,
      category: normalized.category,
      titleAuto: normalized.titleAuto,
      titleUserOverride: normalized.titleUserOverride,
      merchantName: normalized.merchantName,
    },
  };
}

function isSplitDataColumnMissing(error: { message?: string } | null): boolean {
  const msg = (error?.message ?? '').toLowerCase();
  return msg.includes('split_data') || msg.includes('schema cache');
}

function rowToSplit(row: {
  id: string;
  title: string;
  exclude_me: boolean;
  is_deleted?: boolean;
  receipt_image_path?: string;
  participants: Participant[];
  created_at: string;
  split_data: any;
}): Split {
  const createdAt = new Date(row.created_at).getTime();
  const updatedAt = row.split_data?.updatedAt ?? createdAt;
  const category = row.split_data?.category;
  const merchantName = row.split_data?.merchantName;
  // Backfill auto-title for existing splits that don't have one
  const titleAuto = row.split_data?.titleAuto ?? generateAutoTitle({ merchantName, category, createdAt });
  const titleUserOverride = row.split_data?.titleUserOverride ?? false;
  return normalizeSplit({
    id: row.id,
    name: row.title,
    createdAt,
    updatedAt,
    items: row.split_data?.items ?? [],
    participants: row.participants ?? [],
    taxInCents: row.split_data?.taxInCents ?? 0,
    tipInCents: row.split_data?.tipInCents ?? 0,
    currentStep: row.split_data?.currentStep ?? 'receipt',
    category,
    excludeMe: row.exclude_me,
    isDeleted: row.is_deleted ?? false,
    titleAuto,
    titleUserOverride,
    merchantName,
    receiptImagePath: row.receipt_image_path ?? undefined,
  });
}

export async function listSplits(): Promise<Split[]> {
  const { data, error } = await supabase.from('splits').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load splits: ${error.message}`);
  if (!data) return [];
  return data.map(rowToSplit);
}

export async function createSplit(split: Split): Promise<Split> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to create a split');
  if (!user.id || !isValidUuid(user.id)) {
    throw new Error('Invalid user_id: must be a valid UUID from auth');
  }
  const normalized = normalizeSplit(split);
  const row = splitToRow(normalized);
  // Omit id so Postgres generates it (table must have DEFAULT gen_random_uuid() or uuid_generate_v4() on id).
  const payloadWithSplitData = {
    user_id: user.id,
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    receipt_image_path: row.receipt_image_path,
    participants: row.participants,
    created_at: row.created_at,
    split_data: row.split_data,
  };
  const payloadRequiredOnly = {
    user_id: user.id,
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    participants: row.participants,
    created_at: row.created_at,
  };
  let result = await supabase.from('splits').insert(payloadWithSplitData).select().single();
  if (result.error && isSplitDataColumnMissing(result.error)) {
    result = await supabase.from('splits').insert(payloadRequiredOnly).select().single();
  }
  if (result.error) throw new Error(`Failed to create split: ${result.error.message}`);
  const saved = rowToSplit(result.data);
  try {
    // Use saved id: createSplit omits id so Postgres generates it; normalized.id is client-only.
    await upsertFriendRequestsForSplit({ ...normalized, id: saved.id });
  } catch (e) {
    if (__DEV__) {
      console.warn('[splits] upsertFriendRequestsForSplit after create failed:', e);
    }
    // non-fatal: split is saved; requests can be retried
  }
  return saved;
}

export async function updateSplit(split: Split): Promise<Split> {
  const normalized = normalizeSplit({ ...split, updatedAt: Date.now() });
  const row = splitToRow(normalized);
  const updateWithSplitData = {
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    receipt_image_path: row.receipt_image_path,
    participants: row.participants,
    split_data: row.split_data,
  };
  const updateRequiredOnly = {
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    participants: row.participants,
  };
  let result = await supabase
    .from('splits')
    .update(updateWithSplitData)
    .eq('id', split.id)
    .select()
    .single();
  if (result.error && isSplitDataColumnMissing(result.error)) {
    result = await supabase
      .from('splits')
      .update(updateRequiredOnly)
      .eq('id', split.id)
      .select()
      .single();
  }
  if (result.error) throw new Error(`Failed to update split: ${result.error.message}`);
  const saved = rowToSplit(result.data);
  try {
    await upsertFriendRequestsForSplit(normalized);
  } catch (e) {
    if (__DEV__) {
      console.warn('[splits] upsertFriendRequestsForSplit after update failed:', e);
    }
    // non-fatal
  }
  return saved;
}

export async function softDeleteSplit(splitId: string): Promise<void> {
  const { error } = await supabase
    .from('splits')
    .update({ is_deleted: true })
    .eq('id', splitId);
  if (error) throw new Error(`Failed to delete split: ${error.message}`);
}

export async function restoreSplit(splitId: string): Promise<void> {
  const { error } = await supabase
    .from('splits')
    .update({ is_deleted: false })
    .eq('id', splitId);
  if (error) throw new Error(`Failed to restore split: ${error.message}`);
}
