-- Add avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Public storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users upload avatars to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;

-- Authenticated users may upload only to their own folder: avatars/{user_id}/...
CREATE POLICY "Users upload avatars to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can read avatars (public bucket)
CREATE POLICY "Anyone can read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can update their own avatar files
CREATE POLICY "Users update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own avatar files
CREATE POLICY "Users delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
