import { supabase } from './supabaseClient';
import { Split, Participant } from '@/types/split';
import { generateId } from '@/utils/formatting';

const ME_PARTICIPANT_ID = 'me';
const ME_PARTICIPANT_NAME = 'Me';

const DEBUG_SPLITS = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV && typeof (window as any)?.__DEBUG_SPLITS__ === 'true';
function debugLog(...args: unknown[]) {
  if (DEBUG_SPLITS) console.log('[splits]', ...args);
}

/**
 * Normalize split: ensure excludeMe is set (default false), and "me" participant exists/doesn't exist accordingly.
 * This matches the logic from storage.ts to maintain consistency.
 */
function normalizeSplit(split: Split): Split {
  const excludeMe = split.excludeMe ?? false;
  const hasMe = split.participants.some(p => p.id === ME_PARTICIPANT_ID);
  
  let participants = [...split.participants];
  
  if (!excludeMe && !hasMe) {
    // Add "me" participant
    participants = [
      { id: ME_PARTICIPANT_ID, name: ME_PARTICIPANT_NAME },
      ...participants,
    ];
  } else if (excludeMe && hasMe) {
    // Remove "me" participant
    participants = participants.filter(p => p.id !== ME_PARTICIPANT_ID);
  }
  
  return {
    ...split,
    excludeMe,
    participants,
  };
}

/**
 * Calculate total from split items, tax, and tip. Always returns a finite integer (cents).
 */
function calculateTotal(split: Split): number {
  const itemsTotal = split.items.reduce((sum, item) => sum + (Number(item.priceInCents) || 0) * (Number(item.quantity) || 0), 0);
  const total = itemsTotal + (Number(split.taxInCents) || 0) + (Number(split.tipInCents) || 0);
  return Number.isFinite(total) ? Math.round(total) : 0;
}

/**
 * Convert Split to database row format
 * 
 * NOTE: This assumes the splits table has a `split_data` jsonb column to store
 * additional fields (items, taxInCents, tipInCents, currentStep, category).
 * If your schema doesn't have this column, add it:
 *   ALTER TABLE splits ADD COLUMN split_data jsonb;
 */
function splitToRow(split: Split): {
  id: string;
  title: string;
  total: number;
  exclude_me: boolean;
  participants: Participant[];
  created_at: string;
  // Store full split data in a jsonb field for all other fields
  split_data: Omit<Split, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'participants' | 'excludeMe'>;
} {
  const normalized = normalizeSplit(split);
  const total = calculateTotal(normalized);
  
  const title = normalized.name?.trim() || `Split ${new Date(normalized.createdAt).toLocaleDateString()}`;
  const createdAt = Number(normalized.createdAt);
  const created_at = Number.isFinite(createdAt) ? new Date(createdAt).toISOString() : new Date().toISOString();

  return {
    id: normalized.id,
    title,
    total,
    exclude_me: Boolean(normalized.excludeMe),
    participants: Array.isArray(normalized.participants) ? normalized.participants : [],
    created_at,
    split_data: {
      items: normalized.items,
      taxInCents: normalized.taxInCents,
      tipInCents: normalized.tipInCents,
      currentStep: normalized.currentStep,
      category: normalized.category,
    },
  };
}

/**
 * Convert database row to Split
 */
function rowToSplit(row: {
  id: string;
  title: string;
  total: number;
  exclude_me: boolean;
  participants: Participant[];
  created_at: string;
  split_data: any;
}): Split {
  const createdAt = new Date(row.created_at).getTime();
  const updatedAt = row.split_data?.updatedAt ?? createdAt;
  
  return normalizeSplit({
    id: row.id,
    name: row.title,
    createdAt,
    updatedAt,
    items: row.split_data?.items ?? [],
    participants: row.participants,
    taxInCents: row.split_data?.taxInCents ?? 0,
    tipInCents: row.split_data?.tipInCents ?? 0,
    currentStep: row.split_data?.currentStep ?? 'receipt',
    category: row.split_data?.category,
    excludeMe: row.exclude_me,
  });
}

/**
 * List all splits for the current user.
 * Requires an active session - RLS filters by auth.uid() = user_id.
 */
export async function listSplits(): Promise<Split[]> {
  const { data, error } = await supabase
    .from('splits')
    .select('*')
    .order('created_at', { ascending: false });

  if (DEBUG_SPLITS) {
    debugLog('listSplits response', { rowCount: data?.length ?? 0, error: error?.message });
  }

  if (error) {
    console.error('Failed to list splits:', error);
    throw new Error(`Failed to load splits: ${error.message}`);
  }

  if (!data) return [];

  return data.map(rowToSplit);
}

/** True if the error indicates split_data column is missing (table has only required columns). */
function isSplitDataColumnMissing(error: { message?: string } | null): boolean {
  const msg = (error?.message ?? '').toLowerCase();
  return msg.includes('split_data') || msg.includes('schema cache');
}

/**
 * Create a new split.
 * Inserts required columns: id, user_id, title, total, exclude_me, participants, created_at.
 * If the table has split_data (jsonb), also sends items/tax/tip/category/currentStep; otherwise retries without it.
 */
export async function createSplit(split: Split): Promise<Split> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be signed in to create a split');
  }

  const normalized = normalizeSplit(split);
  const row = splitToRow(normalized);

  const payloadWithSplitData = {
    id: row.id,
    user_id: user.id,
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    participants: row.participants,
    created_at: row.created_at,
    split_data: row.split_data,
  };

  const payloadRequiredOnly = {
    id: row.id,
    user_id: user.id,
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    participants: row.participants,
    created_at: row.created_at,
  };

  if (DEBUG_SPLITS) {
    debugLog('createSplit payload', { id: row.id, title: row.title, total: row.total, user_id: user.id });
  }

  let result = await supabase.from('splits').insert(payloadWithSplitData).select().single();

  if (result.error && isSplitDataColumnMissing(result.error)) {
    result = await supabase.from('splits').insert(payloadRequiredOnly).select().single();
  }

  if (DEBUG_SPLITS) {
    debugLog('createSplit response', { data: result.data?.id, error: result.error?.message });
  }

  if (result.error) {
    console.error('Failed to create split:', result.error);
    throw new Error(`Failed to create split: ${result.error.message}`);
  }

  return rowToSplit(result.data);
}

/**
 * Update an existing split.
 * Only updates splits owned by the current user (enforced by RLS).
 * If the table has no split_data column, updates only title, total, exclude_me, participants.
 */
export async function updateSplit(split: Split): Promise<Split> {
  const normalized = normalizeSplit({
    ...split,
    updatedAt: Date.now(),
  });
  const row = splitToRow(normalized);

  const updateWithSplitData = {
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    participants: row.participants,
    split_data: row.split_data,
  };

  const updateRequiredOnly = {
    title: row.title,
    total: row.total,
    exclude_me: row.exclude_me,
    participants: row.participants,
  };

  if (DEBUG_SPLITS) {
    debugLog('updateSplit', { id: split.id, title: row.title, total: row.total });
  }

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

  if (DEBUG_SPLITS) {
    debugLog('updateSplit response', { data: result.data?.id, error: result.error?.message });
  }

  if (result.error) {
    console.error('Failed to update split:', result.error);
    throw new Error(`Failed to update split: ${result.error.message}`);
  }

  return rowToSplit(result.data);
}

/**
 * Delete a split.
 * Only deletes splits owned by the current user (enforced by RLS).
 */
export async function deleteSplit(splitId: string): Promise<void> {
  const { error } = await supabase
    .from('splits')
    .delete()
    .eq('id', splitId);
  
  if (error) {
    console.error('Failed to delete split:', error);
    throw new Error(`Failed to delete split: ${error.message}`);
  }
}
