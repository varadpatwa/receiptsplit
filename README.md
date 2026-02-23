# ReceiptSplit

A mobile-first web app that helps groups split restaurant bills in under 60 seconds with cent-perfect accuracy. This repo is a **monorepo** with a React (Vite) web app, an Expo React Native mobile app, and a shared TypeScript package.

## Monorepo structure

- **`apps/web`** – React (Vite) web app (existing app, unchanged behavior).
- **`apps/mobile`** – Expo React Native app (auth, onboarding, Home/Spending/Friends/Account).
- **`packages/shared`** – Shared TypeScript types and pure logic (split types, validation, spending helpers). No DOM or browser APIs.

## How to run

### Prerequisites

- Node.js 18+
- For mobile: Expo CLI (`npx expo`), iOS Simulator and/or Android emulator

### Install (from repo root)

```bash
npm install
```

### Build shared package (required before web or mobile)

```bash
npm run build:shared
# or: npm run build -w @receiptsplit/shared
```

### Web app

```bash
# Development
npm run dev:web
# or: npm run dev -w web

# Production build
npm run build:web
# or: npm run build -w web
```

- **Env vars (web):** Create `apps/web/.env.local` with:
  - `VITE_SUPABASE_URL` – your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` – your Supabase anon key

### Mobile app (Expo)

```bash
# Start Expo dev server
npm run dev:mobile
# or: npm run start -w mobile
# or from apps/mobile: npx expo start
```

- **Env vars (mobile):** Create `apps/mobile/.env` (or use `eas env` / Expo env config) with:
  - `EXPO_PUBLIC_SUPABASE_URL` – same Supabase project URL
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` – same Supabase anon key

Then open the app in iOS Simulator (`i` in terminal) or Android emulator (`a`), or scan the QR code with Expo Go.

### Checklist

- [ ] **Web still works:** From root, `npm run build:shared` then `npm run dev:web`. Web app loads; sign in, splits, friends, account work as before.
- [ ] **Mobile launches:** From root, `npm run dev:mobile` (after `npm install` and building shared). App opens in simulator or device.
- [ ] **Mobile sign up / login / onboarding:** Sign up with email, confirm if required, log in; if profile has no handle, complete Onboarding (handle + optional display name); then land on main tabs (Home, Spending, Friends, Account).
- [ ] **Mobile Friends:** Search by handle, send request; accept/reject incoming; accept uses RPC; lists and remove friend work.
- [ ] **Mobile Account:** Show/edit handle and display name; sign out returns to Welcome.

## Features

- **5-Step Flow**: Receipt → People → Assign → Summary → Export
- **Cent-Perfect Accuracy**: Advanced calculation engine ensures exact splits with no rounding errors
- **Apple-Inspired UI**: Minimal, high-contrast design with smooth micro-interactions
- **Local Storage**: Automatically saves splits for later access
- **Smart Assignment**: Easily assign items to multiple people with tap-to-toggle chips
- **Running Tally**: Live updates show each person's share as you assign items
- **Shareable Breakdown**: Copy or share detailed per-person breakdowns
- **Mobile-First**: Optimized for touch with generous tap targets and decimal keyboards

## Tech Stack

- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** for utility-first styling
- **Lucide React** for icons
- **localStorage** for data persistence

## Project Structure

```
src/
├── types/
│   └── split.ts              # TypeScript interfaces for Split, Item, Participant
├── utils/
│   ├── storage.ts            # localStorage operations
│   ├── calculations.ts       # Cent-perfect split calculations
│   └── formatting.ts         # Currency and date formatting
├── hooks/
│   ├── useSplits.ts          # Split management with autosave
│   └── useCalculations.ts    # Memoized breakdown calculations
├── components/
│   ├── Layout.tsx            # Main layout with radial gradient
│   ├── Stepper.tsx           # Step progress indicator
│   ├── Button.tsx            # Primary/secondary buttons
│   ├── Input.tsx             # Text/number inputs with validation
│   ├── Card.tsx              # Elevated container component
│   ├── ParticipantChip.tsx   # Toggle chips for assignment
│   ├── Toast.tsx             # Slide-up notifications
│   └── screens/
│       ├── Home.tsx          # Split list with create/delete
│       ├── Receipt.tsx       # Item entry with tax/tip
│       ├── People.tsx        # Participant management
│       ├── Assign.tsx        # Item-to-person assignment
│       ├── Summary.tsx       # Per-person breakdown view
│       └── Export.tsx        # Copy/share functionality
└── App.tsx                   # Main app with screen routing
```

## Calculation Engine

The calculation engine guarantees cent-perfect accuracy using integer arithmetic:

1. **Equal Split**: Divides item cost by participant count, distributes remainder cents by participantId (ascending)
2. **Proportional Allocation**: Tax and tip are allocated proportionally to each person's item subtotal
3. **Remainder Distribution**: Any fractional cents are distributed one-by-one to participants in sorted order
4. **Reconciliation**: Total of all participant amounts always equals receipt total exactly

## Key Design Principles

### Apple iOS Native Aesthetic
- Near-black background (#0B0B0C) with subtle radial gradient
- Pure white text with careful hierarchy (white → white/80 → white/60 → white/40)
- Cards on #141416 with border-white/10 for gentle elevation
- Monochrome palette - no color accents except for validation states
- Generous spacing: px-5 py-6, space-y-6 between sections
- Active states use scale-95 with 150ms transitions
- Minimum 44px tap targets for all interactive elements

### Typography
- System font stack: -apple-system, BlinkMacSystemFont
- Headers: text-2xl to text-3xl with font-semibold and tracking-tight
- Body: text-base with font-normal
- Numbers: tabular-nums for perfect alignment

### Motion
- 200ms ease-out page transitions with 8px slide
- 150ms chip toggles and button presses
- Toast notifications slide up from bottom
- Active states scale to 95%
- Subtle fade-in animations for modal overlays

## Development

```bash
# From repo root
npm install
npm run build:shared   # build shared package first

# Web
npm run dev:web       # dev server
npm run build:web     # production build

# Mobile
npm run dev:mobile    # Expo start (then i for iOS, a for Android)

# Type check (per app)
cd apps/web && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
cd packages/shared && npx tsc --noEmit
```

## Usage Flow

1. **Home**: Tap "New Split" or select an existing split
2. **Receipt**: Add items with prices and quantities, enter tax/tip
3. **People**: Add at least 2 participants
4. **Assign**: Tap participant chips to assign items (multi-select supported)
5. **Summary**: Review per-person breakdowns with exact totals
6. **Export**: Copy or share the breakdown text

## Features in Detail

### Autosave
- Debounced 300ms during typing
- Immediate save on blur and navigation
- Persists to localStorage automatically

### Validation
- Prices must be greater than $0
- At least 2 participants required
- All items must be assigned before proceeding
- Real-time error messages with inline feedback

### Edge Cases Handled
- Empty item names → Shows "Unnamed item"
- Zero prices → Validation error
- Participant deletion → Removes from all assignments
- Item deletion → Removes all participant assignments
- All subtotals zero → Tax/tip allocated as $0.00

## Browser Support

- Modern browsers with ES2020+ support
- localStorage required
- Native share API optional (fallback to clipboard)

## App Items (Supabase + RLS)

The `/app/items` page uses Supabase table `public.items` with RLS. Routes:

- **`/login`** – Sign in (redirects to `/app/items` when already authenticated).
- **`/app/items`** – List/add/edit/delete items (protected; redirects to `/login` if no session).

### Manual verification checklist

- [ ] **Create items with account A**: Sign in as user A, go to `/app/items`, add a few items. Confirm they appear.
- [ ] **Log into account B and confirm you cannot see A’s items**: Sign out, sign in as user B, go to `/app/items`. List should be empty or only show B’s items (no A’s items).
- [ ] **Try inserting with a fake `user_id` (should fail)**: The client never sends `user_id`; `createItem` uses only the current session’s `user_id`. If you bypass the app and call the API with a fake `user_id`, RLS should block it (or the insert uses server-side auth.uid() only).

## Usernames and Friend Requests

The app uses handles/usernames for user discovery and cross-user friend requests via Supabase.

### Schema Requirements

- `public.profiles(id=auth.user.id, handle unique not null, display_name)`
- `public.friend_requests(id, from_user_id, to_user_id, status pending/accepted/rejected)`
- `public.friendships(user_id, friend_id)` (bidirectional)
- RPC: `public.accept_friend_request(req_id uuid)`

### Manual Test Checklist

#### Onboarding
- [ ] **User A signs up**: After signup/login, user A is redirected to `/onboarding/username`
- [ ] **User A sets handle**: Enter handle (e.g., `alice123`), validation works (3-20 chars, lowercase/numbers/underscore)
- [ ] **Handle uniqueness**: Try to use an existing handle, see error "This handle is already taken"
- [ ] **User A completes onboarding**: After setting handle, redirected to main app (`/app`)

#### Profile Management
- [ ] **User A views profile**: Go to Account screen, see handle and display name
- [ ] **User A edits display name**: Change display name, save successfully
- [ ] **User A changes handle**: Change handle (with uniqueness check), save successfully

#### Friend Requests
- [ ] **User B signs up**: User B sets handle (e.g., `bob456`)
- [ ] **User A searches for User B**: In Friends screen, search by handle prefix (e.g., `bob`), see User B in results
- [ ] **User A sends request**: Click "Send request" for User B
- [ ] **User B sees incoming request**: User B's Friends screen shows incoming request from User A
- [ ] **User B accepts request**: User B clicks accept, both users now see each other in Friends list
- [ ] **User A cannot see random requests**: User A only sees requests they sent or received (not other users' requests)

#### Friends List
- [ ] **Friends appear correctly**: Both users see each other with handle and display name
- [ ] **Remove friend**: User A removes User B, both users no longer see each other in friends list

#### Data Isolation
- [ ] **User C signs up**: User C sets handle, cannot see User A or User B's friend requests
- [ ] **User C searches**: Can find User A and User B by handle, can send requests
- [ ] **User C's requests are private**: User A and User B cannot see User C's requests unless involved

## Known limitations / TODOs

- **Mobile "New Split"**: Home tab shows "New Split" and recent splits from Supabase, but creating/editing a full split (receipt → people → assign → summary) is not implemented on mobile; use the web app for that flow.
- **Mobile deep linking**: No custom scheme or universal links configured yet.
- **Env for mobile**: Use `apps/mobile/.env` with `EXPO_PUBLIC_*` or Expo’s env support; ensure keys match web for same Supabase project.

## License

MIT

