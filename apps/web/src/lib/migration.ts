import { supabase } from './supabaseClient';
import { Split } from '@/types/split';
import { loadSplits } from '@/utils/storage';
import { createSplit, updateSplit } from './splits';

const MIGRATION_FLAG_PREFIX = 'receiptsplit:migrated';

/**
 * Get migration flag key for a user
 */
function getMigrationFlagKey(userId: string): string {
  return `${MIGRATION_FLAG_PREFIX}:${userId}`;
}

/**
 * Check if user has already been migrated
 */
export function isMigrated(userId: string): boolean {
  try {
    const flag = localStorage.getItem(getMigrationFlagKey(userId));
    return flag === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark user as migrated
 */
function setMigrated(userId: string): void {
  try {
    localStorage.setItem(getMigrationFlagKey(userId), 'true');
  } catch (error) {
    console.error('Failed to set migration flag:', error);
  }
}

/**
 * Migrate splits from localStorage to Supabase
 */
async function migrateSplits(userId: string): Promise<number> {
  const localSplits = loadSplits(userId);
  if (localSplits.length === 0) return 0;
  
  let migratedCount = 0;
  
  for (const split of localSplits) {
    try {
      // Try to create the split
      await createSplit(split);
      migratedCount++;
    } catch (error) {
      // If split already exists (by ID), try to update it
      try {
        await updateSplit(split);
        migratedCount++;
      } catch (updateError) {
        console.error(`Failed to migrate split ${split.id}:`, updateError);
        // Continue with next split
      }
    }
  }
  
  return migratedCount;
}

/**
 * Migrate friends from localStorage to Supabase
 * NOTE: Friends migration is disabled - old localStorage friends were just names,
 * not user accounts. The new system requires friend requests between actual users.
 * Users will need to re-add friends through the friend request system.
 */
async function migrateFriends(userId: string): Promise<number> {
  // Friends migration disabled - old friends were names, not user accounts
  // Users need to use the friend request system to add friends
  return 0;
}

/**
 * Clear localStorage data after successful migration (optional)
 */
function clearLocalStorage(userId: string): void {
  try {
    // Clear splits
    const splitsKey = `receiptsplit:splits:${userId}`;
    localStorage.removeItem(splitsKey);
    localStorage.removeItem('receiptsplit:splits'); // Legacy key
    
    // Clear friends
    const friendsKey = `receiptsplit:friends:${userId}`;
    localStorage.removeItem(friendsKey);
    localStorage.removeItem('receiptsplit:friends'); // Legacy key
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
    // Non-critical, continue
  }
}

/**
 * Run migration for a user if not already migrated.
 * Returns migration result with counts.
 */
export async function migrateUserData(userId: string): Promise<{
  migrated: boolean;
  splitsCount: number;
  friendsCount: number;
  error?: string;
}> {
  // Check if already migrated
  if (isMigrated(userId)) {
    return {
      migrated: false,
      splitsCount: 0,
      friendsCount: 0,
    };
  }
  
  // Check for active session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== userId) {
    return {
      migrated: false,
      splitsCount: 0,
      friendsCount: 0,
      error: 'No active session for user',
    };
  }
  
  try {
    // Migrate splits
    const splitsCount = await migrateSplits(userId);
    
    // Migrate friends
    const friendsCount = await migrateFriends(userId);
    
    // Mark as migrated
    setMigrated(userId);
    
    // Optionally clear localStorage (commented out by default to allow rollback)
    // clearLocalStorage(userId);
    
    return {
      migrated: true,
      splitsCount,
      friendsCount,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      migrated: false,
      splitsCount: 0,
      friendsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
