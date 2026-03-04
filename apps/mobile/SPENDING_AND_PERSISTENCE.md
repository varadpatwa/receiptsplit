# Spending & split persistence – implementation summary

## Web source-of-truth (reused / shared)

| Web | packages/shared | Notes |
|-----|-----------------|--------|
| `apps/web/src/utils/spendingAggregation.ts` | Re-exports from `@receiptsplit/shared` | No logic moved; web already uses shared |
| `packages/shared/src/spending.ts` | **Source of truth** | `getSplitsThisMonth`, `getUserSpendingCents`, `getCategoryTotals`, `getUserShareCents`, `CategoryTotal` |
| `apps/web/src/hooks/useSplits.ts` | N/A (web-only) | Behavior mirrored in mobile `SplitsContext` |
| `apps/web/src/lib/splits.ts` | N/A | Mobile `lib/splits.ts` mirrors create/update/delete + fallback |

**Shared logic (unchanged):**
- `getSplitsThisMonth(splits)` – filters to current month by `updatedAt`/`createdAt`
- `getUserSpendingCents(splits)` – sum of user’s share per split (excludeMe → 0)
- `getCategoryTotals(splits)` – by category with `cents` and `percent`
- Types: `Split`, `CategoryTotal`, etc. from `@receiptsplit/shared`

---

## Mobile files changed / created

### 1. `apps/mobile/src/lib/splits.ts`
- **createSplit:** Sends only required columns first: `id`, `user_id`, `title`, `total`, `exclude_me`, `participants`, `created_at`. If insert fails with a “split_data” or “schema cache” error, retries with **payloadRequiredOnly** (no `split_data`).
- **updateSplit:** Same idea: try with `split_data`; on same error, retry with only `title`, `total`, `exclude_me`, `participants`.
- **splitToRow:** Ensures NOT NULL-safe values: `total` (number, rounded), `title` (string, fallback `Split <date>`, max 512 chars), `participants` (array, default `[]`), `created_at` (ISO string).
- **isSplitDataColumnMissing:** Helper to detect when the table has no `split_data` column.

### 2. `apps/mobile/src/contexts/SplitsContext.tsx`
- **refetch:** New function to reload splits from Supabase (e.g. after restore or manual refresh).
- **saveSplit:** When `immediate === true`, `doSave()` is awaited and **rethrows** on failure so callers (e.g. Home “New Split”) don’t navigate on error. When debounced, errors are only set in state (no throw).
- **Exports:** `refetch` added to context value.

### 3. `apps/mobile/src/screens/HomeScreen.tsx`
- Uses `saveError` and `clearSaveError` from `useSplits`.
- Renders a **save error banner** when `saveError` is set; pressing it calls `clearSaveError`.
- “New Split” still calls `saveSplit(newSplit, true).then(() => navigate('Receipt')).catch(() => {})` so navigation only happens after a successful save.

### 4. `apps/mobile/src/screens/split/ReceiptScreen.tsx`
- Optional props: `saveError`, `clearSaveError`.
- When present, shows the same style of **save error banner** as Home (dismiss clears error).

### 5. `apps/mobile/src/navigation/HomeStack.tsx`
- **ReceiptConnector** passes `saveError` and `clearSaveError` from `useSplits()` into `ReceiptScreen`.

### 6. `apps/mobile/src/screens/SpendingScreen.tsx`
- **Subtitle:** “Your share of this month's splits” (matches web).
- **Aggregation:** Uses `getSplitsThisMonth`, `getUserSpendingCents`, `getCategoryTotals` from `@receiptsplit/shared` (unchanged).
- **Category list:** Same categories and colors as web: Restaurant, Grocery, Entertainment, Utilities, Other, Uncategorized; each row shows a **color dot**, name, amount, and **percent**.
- **Empty state:** When `totalCents === 0`: “No spending this month yet.” and “Splits you add will show here by category.”

---

## createSplit required fields and errors

**Required columns (NOT NULL) in `public.splits`:**
- `user_id` – from `supabase.auth.getUser()`
- `title` – from `splitToRow` (fallback: `Split <MM/DD/YYYY>`)
- `total` – number from `calculateTotal(split)` (integer cents)
- `exclude_me` – boolean
- `participants` – JSON array (normalized list)
- `created_at` – ISO string

**Behavior:**
- All of these are set in `payloadWithSplitData` and `payloadRequiredOnly` for create.
- If the table has no `split_data` column, the first insert can fail; the code retries with `payloadRequiredOnly` so insert succeeds with only required columns.
- Any insert/update error is thrown and surfaced: **HomeScreen** and **ReceiptScreen** show a red banner with the message; user can dismiss.

---

## Verification checklist

- **Create a split on mobile** → Network: `POST /rest/v1/splits` returns **201** and a row is returned.
- **Supabase:** `SELECT count(*) FROM public.splits` increases after creating a split.
- **Refresh app** → Split still appears on Home (list comes from `listSplits()` after auth/sessionLoaded).
- **Spending tab** → Shows “This month” total and “By category” with correct amounts and percents; when no data, shows empty state copy.
- **Different user** → After signing in as another user, only that user’s splits (and spending) are shown (RLS).

---

## Commit message suggestion

```
fix(mobile): persist splits to Supabase and align Spending with web

- Add split_data column fallback in createSplit/updateSplit (retry with
  required-only payload when split_data column is missing)
- Ensure NOT NULL columns always set: user_id, title, total, exclude_me,
  participants, created_at
- SplitsContext: refetch, and make saveSplit reject on immediate failure
  so New Split only navigates after successful create
- Surface save errors: banner on Home and Receipt with dismiss
- Spending: use shared aggregation, add category colors/percent, empty
  state, and subtitle "Your share of this month's splits"
```
