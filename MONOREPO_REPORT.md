# Monorepo + Mobile App – Implementation Report

## Files / folders moved or created

### Repo restructure (existing content moved into monorepo)

- **apps/web/** – Existing web app moved here (or created by copying original app). Contains:
  - `src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `components.json`
  - `package.json` with dependency `@receiptsplit/shared` (file link to `../../packages/shared`)
  - Web imports from `@receiptsplit/shared` for types, `validateHandle`, spending helpers, `getReceiptTotal` (via re-exports in `apps/web/src/types/split.ts`, `utils/spendingAggregation.ts`, `utils/calculations.ts`, `lib/profiles.ts`)

### New packages

- **packages/shared/**
  - `package.json`, `tsconfig.json`
  - `src/types.ts` – Split, Item, Participant, SplitCategory, etc.
  - `src/validation.ts` – `validateHandle` (3–20 chars, lowercase/numbers/underscore)
  - `src/receiptTotal.ts` – `getReceiptTotal(split)`
  - `src/spending.ts` – `getThisMonthStart`, `getSplitsThisMonth`, `getUserShareCents`, `getTotalSpendingCents`, `getUserSpendingCents`, `getCategoryTotals`
  - `src/index.ts` – re-exports

### New mobile app

- **apps/mobile/**
  - `package.json` – Expo ~51, React Navigation (native-stack, bottom-tabs), Supabase, AsyncStorage, react-native-screens, react-native-safe-area-context, react-native-url-polyfill, `@receiptsplit/shared`
  - `app.json`, `tsconfig.json`, `babel.config.js`
  - **App.tsx** – AuthProvider → NavigationContainer → AppNavigator (Welcome/Login/Signup | OnboardingUsername | MainTabs)
  - **src/contexts/AuthContext.tsx** – session, userId, email, sessionLoaded, onAuthStateChange
  - **src/contexts/ProfileRefreshContext.tsx** – refreshProfile callback for onboarding completion
  - **src/lib/supabase.ts** – createClient with AsyncStorage for auth; getProfile, upsertProfile, isHandleAvailable, searchProfilesByHandle
  - **src/lib/splits.ts** – listSplits (Supabase → Split[] with rowToSplit)
  - **src/lib/friends.ts** – listFriends, deleteFriend
  - **src/lib/friendRequests.ts** – getIncomingRequests, getOutgoingRequests, sendFriendRequest, acceptFriendRequest (RPC), rejectFriendRequest
  - **src/screens/WelcomeScreen.tsx** – dark theme, “SIGN UP FOR FREE”, “LOG IN”
  - **src/screens/LoginScreen.tsx** – email/password sign in
  - **src/screens/SignupScreen.tsx** – email/password sign up, email confirmation message
  - **src/screens/OnboardingUsernameScreen.tsx** – handle + display name, validateHandle from shared, isHandleAvailable, upsertProfile, refreshProfile on success
  - **src/navigation/MainTabs.tsx** – bottom tabs: Home, Spending, Friends, Account
  - **src/screens/HomeScreen.tsx** – “New Split” button + recent splits list (listSplits from Supabase)
  - **src/screens/SpendingScreen.tsx** – monthly totals via shared getSplitsThisMonth, getUserSpendingCents, getCategoryTotals
  - **src/screens/FriendsScreen.tsx** – search by handle, send request, incoming/outgoing lists, accept/reject (accept uses RPC)
  - **src/screens/AccountScreen.tsx** – show/edit handle and display_name, logout

### Root

- **package.json** – npm workspaces: `["apps/*", "packages/*"]`; scripts: `dev:web`, `build:web`, `build:shared`, `dev:mobile`, etc.
- **README.md** – updated with monorepo layout, run instructions, env vars, checklist
- **MONOREPO_REPORT.md** – this file

---

## Exact commands to run

| Action        | Command |
|---------------|---------|
| Install       | `npm install` (from root) |
| Build shared  | `npm run build:shared` or `npm run build -w @receiptsplit/shared` |
| Web dev       | `npm run dev:web` or `npm run dev -w web` |
| Web build     | `npm run build:web` or `npm run build -w web` |
| Mobile start  | `npm run dev:mobile` or `npm run start -w mobile` or `cd apps/mobile && npx expo start` |
| iOS simulator | From Expo terminal: press `i` |
| Android       | From Expo terminal: press `a` or use Android emulator |

---

## Known limitations / TODOs

1. **Mobile “New Split”** – Home shows “New Split” and recent splits from Supabase only. The full split flow (receipt → people → assign → summary → export) is not implemented on mobile; use the web app to create/edit splits.
2. **Mobile env** – Supabase URL and anon key must be set via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (e.g. in `apps/mobile/.env` or Expo env config).
3. **Web app location** – Canonical web app lives in `apps/web`; any root-level web files from the original single-app layout are obsolete and can be removed if still present.
4. **Deep linking** – No custom URL scheme or universal links for mobile yet.
5. **Shared build** – Must run `npm run build:shared` (or equivalent) before building or running web/mobile that depend on `@receiptsplit/shared`.
