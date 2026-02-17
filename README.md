# ReceiptSplit

A mobile-first web app that helps groups split restaurant bills in under 60 seconds with cent-perfect accuracy.

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
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit
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

## License

MIT

