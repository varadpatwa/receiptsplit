import { supabase } from './supabase';
import type { SplitEvent } from '@receiptsplit/shared';

interface EventRow {
  id: string;
  user_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

function rowToEvent(row: EventRow, splitIds: string[]): SplitEvent {
  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    splitIds,
  };
}

export async function listEvents(): Promise<SplitEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!events || events.length === 0) return [];

  // Fetch all event_splits for these events in one query
  const eventIds = events.map((e: EventRow) => e.id);
  const { data: links, error: linksError } = await supabase
    .from('event_splits')
    .select('event_id, split_id')
    .in('event_id', eventIds);

  if (linksError) throw linksError;

  const splitIdsByEvent = new Map<string, string[]>();
  for (const link of links ?? []) {
    const existing = splitIdsByEvent.get(link.event_id) ?? [];
    existing.push(link.split_id);
    splitIdsByEvent.set(link.event_id, existing);
  }

  return events.map((row: EventRow) =>
    rowToEvent(row, splitIdsByEvent.get(row.id) ?? [])
  );
}

export async function createEvent(title: string, startDate?: string, endDate?: string): Promise<SplitEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: user.id,
      title,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToEvent(data, []);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export async function addSplitToEvent(eventId: string, splitId: string): Promise<void> {
  const { error } = await supabase
    .from('event_splits')
    .insert({ event_id: eventId, split_id: splitId });

  if (error) throw error;
}

export async function removeSplitFromEvent(eventId: string, splitId: string): Promise<void> {
  const { error } = await supabase
    .from('event_splits')
    .delete()
    .eq('event_id', eventId)
    .eq('split_id', splitId);

  if (error) throw error;
}
