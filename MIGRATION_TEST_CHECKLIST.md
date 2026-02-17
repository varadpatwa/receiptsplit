# Supabase Migration Test Checklist

This document provides a manual test checklist to verify the localStorage to Supabase migration works correctly.

## Prerequisites

1. Ensure Supabase is configured with:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
   - Tables exist: `public.splits` and `public.friends`
   - RLS policies are set to owner-only (`user_id = auth.uid()`)
   - `splits` table has a `split_data` jsonb column (see note in `src/lib/splits.ts`)

## Test 1: User A Migration

### Setup
1. Sign in as User A (or create a new account)
2. Create some test data in localStorage:
   - Create 2-3 splits with different categories
   - Add 2-3 friends
   - Ensure at least one split has `excludeMe: true`

### Migration Test
1. Sign out and sign back in as User A
2. Verify migration runs automatically on first login
3. Check browser console for migration logs
4. Verify data appears in Supabase dashboard:
   - Check `splits` table has User A's splits
   - Check `friends` table has User A's friends
   - Verify `exclude_me` flag is preserved
   - Verify `participants` jsonb contains correct data
5. Verify app functionality:
   - Splits list shows all migrated splits
   - Friends list shows all migrated friends
   - Can edit/delete splits
   - Can edit/delete friends
   - "Exclude me" toggle works correctly

### Expected Results
- ✅ Migration runs once per user (check `receiptsplit:migrated:${userId}` flag in localStorage)
- ✅ All splits migrated with correct data
- ✅ All friends migrated
- ✅ No duplicate data in Supabase
- ✅ App functions normally after migration

## Test 2: User B Migration (Data Isolation)

### Setup
1. Sign out from User A
2. Sign in as User B (different account)
3. Create different test data:
   - Create 1-2 splits with different names/categories
   - Add 1-2 friends with different names

### Migration Test
1. Sign out and sign back in as User B
2. Verify migration runs for User B
3. Verify data isolation:
   - User B only sees their own splits
   - User B only sees their own friends
   - User A's data is not visible to User B
4. Check Supabase dashboard:
   - Verify `user_id` column differs between User A and User B rows
   - Verify RLS prevents cross-user access

### Expected Results
- ✅ User B's migration runs independently
- ✅ User B only sees their own data
- ✅ User A's data remains isolated
- ✅ RLS policies enforce data isolation

## Test 3: Multi-Device Sync

### Setup
1. Complete migration on Device 1 (browser/device)
2. Sign in on Device 2 (different browser/device or incognito)

### Sync Test
1. On Device 2, sign in as the same user
2. Verify data appears automatically (no migration needed - already migrated)
3. Create a new split on Device 2
4. Refresh Device 1
5. Verify new split appears on Device 1
6. Edit a split on Device 1
7. Refresh Device 2
8. Verify changes appear on Device 2

### Expected Results
- ✅ Data syncs across devices
- ✅ Changes propagate correctly
- ✅ No data loss or conflicts
- ✅ Real-time updates work (or at least on refresh)

## Test 4: Debug Panel Verification

### Test Steps
1. Sign in as any user
2. Navigate to Account screen
3. Expand "Debug Info" section
4. Verify counts:
   - Splits count matches Supabase `splits` table count for current user
   - Friends count matches Supabase `friends` table count for current user
5. Create a new split
6. Verify splits count increases
7. Delete a friend
8. Verify friends count decreases

### Expected Results
- ✅ Debug panel shows Supabase counts (not localStorage)
- ✅ Counts update correctly after changes
- ✅ Counts match actual Supabase data

## Test 5: Edge Cases

### Test Scenarios
1. **Empty localStorage**: Sign in with no existing data
   - ✅ Migration completes without errors
   - ✅ App functions normally

2. **Large dataset**: Migrate user with 50+ splits and 20+ friends
   - ✅ All data migrates successfully
   - ✅ No performance issues
   - ✅ Migration completes in reasonable time

3. **Invalid data**: Test with corrupted localStorage data
   - ✅ Migration handles errors gracefully
   - ✅ Valid data still migrates
   - ✅ App doesn't crash

4. **Network failure during migration**:
   - ✅ Error is logged
   - ✅ Migration can be retried on next login
   - ✅ Partial migration doesn't cause issues

5. **Sign out during migration**:
   - ✅ Migration stops gracefully
   - ✅ No data corruption
   - ✅ Can retry on next sign in

## Test 6: Feature Verification

### Verify All Features Work
1. **Splits**:
   - ✅ Create new split
   - ✅ Edit split (name, items, tax, tip, category)
   - ✅ Delete split
   - ✅ "Exclude me" toggle works
   - ✅ Split flows (Receipt → People → Assign → Summary → Export)

2. **Friends**:
   - ✅ Add friend
   - ✅ Delete friend
   - ✅ Friends appear in People screen suggestions
   - ✅ Adding participant as friend works

3. **Calculations**:
   - ✅ Spending totals use user share (respects excludeMe)
   - ✅ Category totals are correct
   - ✅ Per-person breakdowns are accurate

## Schema Requirements

If migration fails with column errors, ensure your Supabase schema includes:

```sql
-- Splits table
CREATE TABLE public.splits (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  total integer NOT NULL,
  exclude_me boolean DEFAULT false,
  participants jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  split_data jsonb -- Additional fields: items, taxInCents, tipInCents, currentStep, category
);

-- Friends table
CREATE TABLE public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS policies (owner-only)
ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own splits"
  ON public.splits FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own friends"
  ON public.friends FOR ALL
  USING (auth.uid() = user_id);
```

## Rollback Plan

If migration causes issues:

1. **Clear migration flag**: Remove `receiptsplit:migrated:${userId}` from localStorage
2. **Data remains**: localStorage data is preserved (not cleared by default)
3. **Re-run migration**: Sign out and sign back in to retry migration
4. **Manual cleanup**: Delete migrated rows from Supabase if needed

## Notes

- Migration runs automatically on first login after update
- Migration flag prevents re-running: `receiptsplit:migrated:${userId}`
- localStorage data is preserved by default (can be cleared after verification)
- Migration is idempotent (safe to run multiple times if flag is cleared)
