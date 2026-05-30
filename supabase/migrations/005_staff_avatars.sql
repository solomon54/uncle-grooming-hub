-- Migration 005: Staff avatar support
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/taqrgsafgexysnqrvzje/sql

-- 1. Add avatar_url column to operators
ALTER TABLE uncle_grooming.operators
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create the staff-avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-avatars',
  'staff-avatars',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: anyone can read (public bucket)
CREATE POLICY IF NOT EXISTS "Public read staff avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'staff-avatars');

-- 4. Storage policy: service role can upload/update/delete
CREATE POLICY IF NOT EXISTS "Service role manages staff avatars"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'staff-avatars')
  WITH CHECK (bucket_id = 'staff-avatars');
