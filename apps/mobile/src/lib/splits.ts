import type { Split, Participant } from '@receiptsplit/shared';
import { supabase } from './supabase';

const ME_PARTICIPANT_ID = 'me';
const ME_PARTICIPANT_NAME = 'Me';

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

function rowToSplit(row: {
  id: string;
  title: string;
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
    participants: row.participants ?? [],
    taxInCents: row.split_data?.taxInCents ?? 0,
    tipInCents: row.split_data?.tipInCents ?? 0,
    currentStep: row.split_data?.currentStep ?? 'receipt',
    category: row.split_data?.category,
    excludeMe: row.exclude_me,
  });
}

export async function listSplits(): Promise<Split[]> {
  const { data, error } = await supabase.from('splits').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load splits: ${error.message}`);
  if (!data) return [];
  return data.map(rowToSplit);
}
