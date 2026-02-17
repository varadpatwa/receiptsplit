import { supabase } from '@/lib/supabaseClient';

export interface ItemRow {
  id: string;
  title: string;
  value: number | null;
  created_at: string;
}

export type ItemsError = Error | { message: string };

/**
 * List items for the current user (RLS enforces user_id = auth.uid()).
 */
export async function listItems(): Promise<{ data: ItemRow[] | null; error: ItemsError | null }> {
  const { data, error } = await supabase
    .from('items')
    .select('id, title, value, created_at')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error as ItemsError };
  return { data: (data ?? []) as ItemRow[], error: null };
}

export interface CreateItemInput {
  title: string;
  value?: number | null;
}

/**
 * Create an item. user_id is set from the current session only (never from client input).
 */
export async function createItem(
  input: CreateItemInput
): Promise<{ data: ItemRow | null; error: ItemsError | null }> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user?.id) {
    return { data: null, error: (sessionError as ItemsError) || new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: session.user.id,
      title: input.title.trim(),
      value: input.value ?? null,
    })
    .select('id, title, value, created_at')
    .single();

  if (error) return { data: null, error: error as ItemsError };
  return { data: data as ItemRow, error: null };
}

export interface UpdateItemInput {
  title?: string;
  value?: number | null;
}

/**
 * Update an item by id (RLS restricts to current user's rows).
 */
export async function updateItem(
  id: string,
  input: UpdateItemInput
): Promise<{ data: ItemRow | null; error: ItemsError | null }> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.value !== undefined) payload.value = input.value;

  const { data, error } = await supabase
    .from('items')
    .update(payload)
    .eq('id', id)
    .select('id, title, value, created_at')
    .single();

  if (error) return { data: null, error: error as ItemsError };
  return { data: data as ItemRow, error: null };
}

/**
 * Delete an item by id (RLS restricts to current user's rows).
 */
export async function deleteItem(id: string): Promise<{ error: ItemsError | null }> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  return { error: (error ?? null) as ItemsError | null };
}
