# Regression checklist: persistence, People, Spending

Use this after any change that touches auth, splits, or the People/Spending screens.

## 1. Refresh persistence

- [ ] Sign in, create a new split (add at least one item, pick category), go to People, add one person, then **refresh the page**.
- [ ] **Expected:** You remain signed in; the split appears on Home; opening it shows your data (receipt + people).
- [ ] Create another split, complete through Summary, then refresh.
- [ ] **Expected:** Both splits appear on Home; Spending tab shows "This month" total and by category.

## 2. Add Friend vs Add Temp (People screen)

- [ ] On the People step, type a name that is **not** a saved friend (e.g. `sid`).
- [ ] **Expected:** Dropdown shows **two** options: `Add "sid" as Temp` and `Add "sid" as Friend` (not two "as Temp").
- [ ] Type a handle that **is** a saved friend.
- [ ] **Expected:** One option shows the friend (with @handle badge); plus "Add as Temp" and "Add as Friend" for the typed string if different.
- [ ] Select "Add as Friend" for a non-friend name: they are added as a participant (fallback to temp if lookup fails).
- [ ] Select "Add as Temp": participant added with "Temp" label in the list.

## 3. Spending tab

- [ ] With no splits this month, open Spending: shows "No spending this month yet."
- [ ] Create a split this month (receipt + people + assign + complete), then open Spending.
- [ ] **Expected:** "This month" total is your share; category breakdown matches the split category; total is (receipt total / participant count) when you're included, or 0 when "Exclude me" was checked.
- [ ] Refresh and open Spending again: same numbers.

## 4. Auth / console

- [ ] Open DevTools Console; sign in and refresh.
- [ ] **Expected:** No red errors. After refresh, session restores and splits load (no brief flash of empty list then wipe).

## Supabase requirements

For persistence and Spending to work:

- Table `splits` has `user_id` (uuid, NOT NULL) and `split_data` (jsonb).
- RLS enabled on `splits` with policy e.g. `USING (auth.uid() = user_id)` and `WITH CHECK (auth.uid() = user_id)`.

See `MIGRATION_TEST_CHECKLIST.md` for schema SQL.
