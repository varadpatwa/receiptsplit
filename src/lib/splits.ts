import { supabase } from './supabaseClient';
import { Split, Participant } from '@/types/split';
import { generateId } from '@/utils/formatting';

const ME_PARTICIPANT_ID = 'me';
const ME_PARTICIPANT_NAME = 'Me';

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
 * Calculate total from split items, tax, and tip
 */
function calculateTotal(split: Split): number {
  const itemsTotal = split.items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  return itemsTotal + split.taxInCents + split.tipInCents;
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
  
  return {
    id: normalized.id,
    title: normalized.name,
    total,
    exclude_me: normalized.excludeMe ?? false,
    participants: normalized.participants,
    created_at: new Date(normalized.createdAt).toISOString(),
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
 * Requires an active session - user_id is derived from auth.uid() via RLS.
 */
export async function listSplits(): Promise<Split[]> {
  const { data, error } = await supabase
    .from('splits')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to list splits:', error);
    throw new Error(`Failed to load splits: ${error.message}`);
  }
  
  if (!data) return [];
  
  return data.map(rowToSplit);
}

/**
 * Create a new split.
 * user_id is automatically set by RLS from auth.uid().
 */
export async function createSplit(split: Split): Promise<Split> {
  const normalized = normalizeSplit(split);
  const row = splitToRow(normalized);
  
  const { data, error } = await supabase
    .from('splits')
    .insert(row)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create split:', error);
    throw new Error(`Failed to create split: ${error.message}`);
  }
  
  return rowToSplit(data);
}

/**
 * Update an existing split.
 * Only updates splits owned by the current user (enforced by RLS).
 */
export async function updateSplit(split: Split): Promise<Split> {
  const normalized = normalizeSplit({
    ...split,
    updatedAt: Date.now(),
  });
  const row = splitToRow(normalized);
  
  const { data, error } = await supabase
    .from('splits')
    .update({
      title: row.title,
      total: row.total,
      exclude_me: row.exclude_me,
      participants: row.participants,
      split_data: row.split_data,
    })
    .eq('id', split.id)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to update split:', error);
    throw new Error(`Failed to update split: ${error.message}`);
  }
  
  return rowToSplit(data);
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
