# Source of truth: Past splits, Monthly spending, Friends

## 1) Past splits (Home screen)

- **Source:** localStorage (not Supabase).
- **File:** `src/utils/storage.ts`
- **Key:** `receiptsplit:splits` (now namespaced: `receiptsplit:splits:${userId ?? 'anonymous'}`).
- **Query / API:** `loadSplits(userId)`, `saveSplits(splits, userId)`, `saveSplit(split, userId)`, `deleteSplit(splitId, userId)`, `getSplit(splitId, userId)`.
- **User scoping:** All reads/writes use key per `userId` from Supabase session; when signed out, `userId === null` → key `receiptsplit:splits:anonymous`.

## 2) Monthly spending (Spending tab)

- **Source:** Same as past splits — derived from the same localStorage splits.
- **File:** `src/utils/spendingAggregation.ts` (filters by this month); data comes from `useSplits()` which uses `src/utils/storage.ts`.
- **Keys:** Same as above (`receiptsplit:splits:${userId ?? 'anonymous'}`).
- **User scoping:** Spending is user-scoped because it reads from the same user-scoped splits list.

## 3) Friends (Friends tab + People step suggestions)

- **Source:** localStorage (not Supabase).
- **File:** `src/utils/friends.ts`
- **Key:** `receiptsplit:friends` (now namespaced: `receiptsplit:friends:${userId ?? 'anonymous'}`).
- **User scoping:** All getFriends/addFriend/removeFriend use key per `userId`; when signed out, key is `receiptsplit:friends:anonymous`.

## Auth listener

- **File:** `src/contexts/AuthContext.tsx`
- `supabase.auth.onAuthStateChange`: on `SIGNED_IN` / `SIGNED_OUT` we set session/userId; consumers (useSplits, Friends, etc.) refetch when userId changes so state is reset/refetched per user.

## Debug panel

- Temporary debug panel shows: current session user id, email, and row counts (splits count, friends count) for the current user’s fetch.
