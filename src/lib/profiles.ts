import { supabase } from './supabaseClient';

export interface Profile {
  id: string;
  handle: string;
  display_name: string | null;
}

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null;
    }
    console.error('Failed to get profile:', error);
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
}

/**
 * Create or update profile
 */
export async function upsertProfile(handle: string, displayName?: string): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      handle: handle.toLowerCase().trim(),
      display_name: displayName?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert profile:', error);
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  return data;
}

/**
 * Check if handle is available (unique)
 */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const handleLower = handle.toLowerCase().trim();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('handle', handleLower)
    .maybeSingle();

  if (error) {
    console.error('Failed to check handle availability:', error);
    throw new Error(`Failed to check handle: ${error.message}`);
  }

  // Available if no profile found, or if it's the current user's handle
  return !data || (user && data.id === user.id);
}

/**
 * Search profiles by handle prefix
 */
export async function searchProfilesByHandle(prefix: string, limit = 10): Promise<Profile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const prefixLower = prefix.toLowerCase().trim();
  if (!prefixLower) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('handle', `${prefixLower}%`)
    .neq('id', user.id) // Exclude self
    .limit(limit);

  if (error) {
    console.error('Failed to search profiles:', error);
    throw new Error(`Failed to search profiles: ${error.message}`);
  }

  return data || [];
}

/**
 * Validate handle format
 */
export function validateHandle(handle: string): { valid: boolean; error?: string } {
  const trimmed = handle.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Handle must be at most 20 characters' };
  }
  
  // Only lowercase letters, numbers, and underscore
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Handle can only contain lowercase letters, numbers, and underscores' };
  }
  
  return { valid: true };
}
