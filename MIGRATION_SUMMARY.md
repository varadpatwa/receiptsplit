# Supabase Migration Summary

## Files Changed

### New Files Created
1. **`src/lib/splits.ts`** - Supabase CRUD operations for splits
   - `listSplits()` - List all splits for current user
   - `createSplit(split)` - Create new split
   - `updateSplit(split)` - Update existing split
   - `deleteSplit(splitId)` - Delete split
   - Includes normalization logic for `excludeMe` and "me" participant
   - Maps Split type to/from database schema

2. **`src/lib/friends.ts`** - Supabase CRUD operations for friends
   - `listFriends()` - List all friends for current user
   - `createFriend(name)` - Create new friend (handles duplicates)
   - `updateFriend(friend)` - Update existing friend
   - `deleteFriend(friendId)` - Delete friend
   - `getFriendByName(name)` - Find friend by name (case-insensitive)

3. **`src/lib/migration.ts`** - One-time migration utility
   - `migrateUserData(userId)` - Migrate localStorage data to Supabase
   - `isMigrated(userId)` - Check if user has been migrated
   - Migrates splits and friends on first login
   - Sets migration flag in localStorage
   - Handles errors gracefully

4. **`MIGRATION_TEST_CHECKLIST.md`** - Manual test checklist
   - Test scenarios for migration verification
   - Multi-user isolation tests
   - Multi-device sync tests
   - Edge case testing
   - Schema requirements documentation

### Files Modified
1. **`src/hooks/useSplits.ts`**
   - Replaced `loadSplits`/`saveSplit`/`deleteSplit` from `storage.ts` with Supabase calls
   - Added migration trigger on user sign-in
   - Made `saveSplit` async (fire-and-forget, debounced)
   - Made `deleteSplit` async
   - Added `loading` state
   - Handles signed-out state (clears data)

2. **`src/components/screens/Friends.tsx`**
   - Replaced `getFriends`/`addFriend`/`removeFriend` from `utils/friends` with Supabase calls
   - Added async data loading with `useEffect`
   - Added migration trigger
   - Added loading states and error handling
   - Shows "Sign in" message when not authenticated

3. **`src/components/screens/People.tsx`**
   - Replaced `getFriends`/`getFriendByName`/`addFriend` from `utils/friends` with Supabase calls
   - Added async friends loading with `useState`/`useEffect`
   - Updated `addParticipantAsFriend` to be async
   - Updated `handleSuggestionSelect` to handle async friend creation

4. **`src/components/screens/Account.tsx`**
   - Replaced `loadSplits`/`getFriends` from localStorage with Supabase calls
   - Debug panel now shows Supabase counts (not localStorage)
   - Added async loading of counts with `useEffect`
   - Counts update when data changes

## Key Features

### Data Layer
- All writes derive `user_id` from session (never accept from UI)
- RLS policies enforce owner-only access
- Normalization logic preserved (excludeMe, "me" participant)
- Error handling and logging throughout

### Migration
- Automatic one-time migration on first login
- Migration flag prevents re-running: `receiptsplit:migrated:${userId}`
- Preserves localStorage data (not cleared by default)
- Handles partial failures gracefully

### Backward Compatibility
- Existing "exclude me" logic maintained
- Normalization functions preserved
- UI behavior unchanged
- Calculations unchanged

## Schema Requirements

The Supabase `splits` table needs a `split_data` jsonb column:

```sql
ALTER TABLE public.splits ADD COLUMN split_data jsonb;
```

This column stores:
- `items` - Array of split items
- `taxInCents` - Tax amount
- `tipInCents` - Tip amount
- `currentStep` - Current step in flow
- `category` - Split category

See `MIGRATION_TEST_CHECKLIST.md` for full schema requirements.

## Commit Message Suggestion

```
feat: migrate from localStorage to Supabase

Migrate app data from user-scoped localStorage to Supabase for cloud sync
and multi-device access.

New data layer:
- src/lib/splits.ts: CRUD operations for splits (listSplits, createSplit, 
  updateSplit, deleteSplit)
- src/lib/friends.ts: CRUD operations for friends (listFriends, createFriend,
  updateFriend, deleteFriend)
- All writes derive user_id from session (RLS enforced)

Migration:
- One-time migration on first login (src/lib/migration.ts)
- Migrates localStorage splits and friends to Supabase
- Migration flag prevents re-running per user
- Preserves localStorage data for rollback

Updated components:
- useSplits hook: Uses Supabase instead of storage.ts
- Friends screen: Uses Supabase instead of localStorage
- People screen: Uses Supabase for friends data
- Account debug panel: Shows Supabase counts

Features preserved:
- excludeMe logic and normalization maintained
- "Me" participant handling unchanged
- All calculations and UI behavior unchanged

Schema note: Requires split_data jsonb column in splits table.
See MIGRATION_TEST_CHECKLIST.md for schema and testing details.
```

## Testing

See `MIGRATION_TEST_CHECKLIST.md` for comprehensive manual testing guide covering:
- User A migration
- User B migration (data isolation)
- Multi-device sync
- Debug panel verification
- Edge cases
- Feature verification
