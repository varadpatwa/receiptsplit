# Split flow: Web → Mobile parity checklist

## Web screen → Mobile screen mapping

| Web screen / component | Mobile screen / component | Notes |
|------------------------|---------------------------|--------|
| **Receipt** (`Receipt.tsx`) | **ReceiptScreen** (`screens/split/ReceiptScreen.tsx`) | Category chips, Exclude me toggle, items (name/price/qty), tax/tip, subtotal/total, validation, Next → People |
| **People** (`People.tsx`) | **PeopleScreen** (`screens/split/PeopleScreen.tsx`) | Friend search by handle, recent people (AsyncStorage), Add as Temp, participants list, delete (except "me"), Next when ≥2 |
| **Assign** (`Assign.tsx`) | **AssignScreen** (`screens/split/AssignScreen.tsx`) | Running tally, items with "Who shared this?", ParticipantChip toggles, Next when all items assigned |
| **Summary** (`Summary.tsx`) | **SummaryScreen** (`screens/split/SummaryScreen.tsx`) | Receipt total, per-person breakdown, Copy (expo-clipboard), Next → Export |
| **Export** (`Export.tsx`) | **ExportScreen** (`screens/split/ExportScreen.tsx`) | Copy, Share (RN Share), preview, Return Home, Delete split (with confirm) |
| **Stepper** | **Stepper** (`components/Stepper.tsx`) | Same 5 steps: Receipt → People → Assign → Summary → Export |
| **ParticipantChip** | **ParticipantChip** (`components/ParticipantChip.tsx`) | Toggle chip for assignment |

## Flow and state

- **Step order:** Receipt → People → Assign → Summary → Export (matches web).
- **State:** `SplitsContext` holds `splits`, `currentSplit`; `createNewSplit`, `loadSplit`, `saveSplit`, `updateCurrentSplit`, `clearCurrentSplit`, `deleteSplit` (same model as web `useSplits`).
- **Me / Exclude me:** "Me" included by default; "Exclude me" toggle on Receipt adds/removes `me` participant (same as web).
- **Persistence:** Same Supabase source: `listSplits`, `createSplit`, `updateSplit`, `deleteSplit` in `lib/splits.ts` (row ↔ Split with `split_data` jsonb).
- **Recent people:** `lib/recentPeople.ts` with AsyncStorage (keyed by userId); used in People step for typeahead + recording.

## Navigation

- **Home tab** is a **Stack:** Home (list) → Receipt → People → Assign → Summary → Export.
- **New Split:** `createNewSplit()` → `saveSplit(..., true)` → navigate to Receipt.
- **Tap split in list:** `loadSplit(id)` → navigate to that split’s `currentStep` (Receipt/People/Assign/Summary/Export).
- **Back from Receipt:** `clearCurrentSplit()` + goBack to Home.
- **Return Home (Export):** `clearCurrentSplit()` + navigate to Home.
- **Delete split (Export):** Confirm → `deleteSplit(id)` + `clearCurrentSplit()` + navigate to Home.

## Shared logic

- **Types:** `@receiptsplit/shared` (Split, Item, Participant, ParticipantBreakdown, SplitCategory, etc.).
- **Calculations:** `packages/shared`: `calculateBreakdown`, `getReceiptTotal`, `generateShareableText`, `verifyReconciliation`, `getRunningTally`, `allItemsAssigned`.
- **Formatting/IDs:** `packages/shared`: `formatCurrency`, `moneyStringToCents`, `centsToMoneyString`, `isValidMoneyInput`, `generateId`, `generateUuid`.

## Files created/updated

**Created**

- `packages/shared/src/formatting.ts` – formatCurrency, moneyStringToCents, centsToMoneyString, isValidMoneyInput, generateId, generateUuid
- `packages/shared/src/calculations.ts` – calculateBreakdown, generateShareableText, verifyReconciliation, getRunningTally, allItemsAssigned
- `apps/mobile/src/lib/recentPeople.ts` – getRecentPeople, recordRecentPerson (AsyncStorage)
- `apps/mobile/src/contexts/SplitsContext.tsx` – SplitsProvider, useSplits
- `apps/mobile/src/components/Stepper.tsx`
- `apps/mobile/src/components/ParticipantChip.tsx`
- `apps/mobile/src/screens/split/ReceiptScreen.tsx`
- `apps/mobile/src/screens/split/PeopleScreen.tsx`
- `apps/mobile/src/screens/split/AssignScreen.tsx`
- `apps/mobile/src/screens/split/SummaryScreen.tsx`
- `apps/mobile/src/screens/split/ExportScreen.tsx`
- `apps/mobile/src/navigation/HomeStack.tsx` – Stack + connector components
- `apps/mobile/SPLIT_FLOW_CHECKLIST.md` (this file)

**Updated**

- `packages/shared/src/index.ts` – export formatting, calculations
- `apps/mobile/src/lib/splits.ts` – createSplit, updateSplit, deleteSplit, splitToRow, calculateTotal
- `apps/mobile/src/lib/friends.ts` – getFriendByHandle
- `apps/mobile/src/screens/HomeScreen.tsx` – useSplits + navigation; New Split → flow; tap split → open at currentStep; no placeholder alerts
- `apps/mobile/src/screens/SpendingScreen.tsx` – useSplits for splits/loading so Spending updates when splits change
- `apps/mobile/src/navigation/MainTabs.tsx` – Home tab uses HomeStack
- `apps/mobile/App.tsx` – SplitsProvider wraps Main
- `apps/mobile/package.json` – expo-clipboard dependency

## End-to-end confirmation

- **New Split** → complete all steps (Receipt → People → Assign → Summary → Export) → **split saved** → appears in **Home** (Recent Splits) and **Spending** (this month).
- **Tap a split** in Recent Splits → opens flow at that split’s **currentStep** (detail/edit).
- **People step:** friend search by handle, recent people, Add as Temp; participants list and remove (except "me").
- **No placeholder alerts** or “use the web app” / “coming soon” messages.
