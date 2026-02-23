import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export const isSupabaseConfigured = (): boolean =>
  !!(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface Profile {
  id: string;
  handle: string;
  display_name: string | null;
}

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertProfile(handle: string, displayName?: string): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('profiles').upsert({
    id: user.id,
    handle: handle.toLowerCase().trim(),
    display_name: displayName?.trim() || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const handleLower = handle.toLowerCase().trim();
  const { data, error } = await supabase.from('profiles').select('id').eq('handle', handleLower).maybeSingle();
  if (error) throw new Error(error.message);
  return !data || (user && data.id === user.id);
}

export async function searchProfilesByHandle(prefix: string, limit = 10): Promise<Profile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const prefixLower = prefix.toLowerCase().trim();
  if (!prefixLower) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('handle', `${prefixLower}%`)
    .neq('id', user.id)
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}
