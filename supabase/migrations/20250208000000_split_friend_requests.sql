-- Split confirmations for friends only. Temp participants do not receive requests.
-- Assumes public.splits exists with: id (uuid), user_id or owner_id (uuid), title, total, exclude_me, participants (jsonb), created_at, etc.
-- If your splits table uses owner_id instead of user_id, replace s.user_id with s.owner_id in policies below.

-- New table: one row per (split, friend) for friend participants. Temp participants have no row.
CREATE TABLE IF NOT EXISTS public.split_friend_requests (
  split_id uuid NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  friend_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  share_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (split_id, friend_user_id)
);

-- Index for receiver lookups
CREATE INDEX IF NOT EXISTS idx_split_friend_requests_friend_status
  ON public.split_friend_requests(friend_user_id, status);

-- RLS
ALTER TABLE public.split_friend_requests ENABLE ROW LEVEL SECURITY;

-- Receiver: select own rows (where they are the friend being asked to confirm)
CREATE POLICY split_friend_requests_select_receiver
  ON public.split_friend_requests FOR SELECT
  USING (friend_user_id = auth.uid());

-- Receiver: update status on own rows only
CREATE POLICY split_friend_requests_update_receiver
  ON public.split_friend_requests FOR UPDATE
  USING (friend_user_id = auth.uid())
  WITH CHECK (friend_user_id = auth.uid());

-- Split owner: insert rows for their splits (verify via splits.user_id; use owner_id if your schema has it)
CREATE POLICY split_friend_requests_insert_owner
  ON public.split_friend_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.splits s
      WHERE s.id = split_friend_requests.split_id
      AND s.user_id = auth.uid()
    )
  );

-- Allow receiver to read the split row for their pending/confirmed requests (so we can show title, date, owner).
-- If your splits table uses owner_id, change s.user_id to s.owner_id and add policy on splits:
CREATE POLICY splits_select_receiver_via_request
  ON public.splits FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.split_friend_requests sfr
      WHERE sfr.split_id = splits.id AND sfr.friend_user_id = auth.uid()
    )
  );

-- If the existing splits table already has a SELECT policy that only allows user_id = auth.uid(), drop or alter it
-- so that the receiver can also select splits they have a split_friend_request for. If you use a single
-- policy that combines both, ensure it matches the above.
