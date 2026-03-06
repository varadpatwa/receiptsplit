-- Fix RLS for split_friend_requests INSERT: use user_id (splits table column).
DROP POLICY IF EXISTS split_friend_requests_insert_owner ON public.split_friend_requests;
CREATE POLICY split_friend_requests_insert_owner
  ON public.split_friend_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.splits s
      WHERE s.id = split_friend_requests.split_id
      AND s.user_id = auth.uid()
    )
  );
