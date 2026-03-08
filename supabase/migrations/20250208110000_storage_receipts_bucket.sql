-- Private storage bucket for receipt images. Edge Function parse-receipt reads via service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Drop policies if they exist (idempotent for re-runs)
DROP POLICY IF EXISTS "Users upload receipts to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own receipts" ON storage.objects;

-- Authenticated users may upload only to their own folder: receipts/{user_id}/...
CREATE POLICY "Users upload receipts to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own receipt files
CREATE POLICY "Users read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Optional: allow users to delete their own receipts
CREATE POLICY "Users delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
