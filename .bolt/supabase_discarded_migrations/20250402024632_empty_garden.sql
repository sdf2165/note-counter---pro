/*
  # Create advertisements table and storage

  1. New Tables
    - `advertisements`
      - `id` (uuid, primary key)
      - `image_url` (text, required)
      - `link_url` (text, required)
      - `active` (boolean, default false)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `advertisements` table
    - Add policies for authenticated users to manage advertisements
    - Add policy for public read access
*/

-- Create advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text NOT NULL,
  active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access"
  ON advertisements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users full access"
  ON advertisements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for advertisement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('advertisements', 'advertisements', true);

-- Set up storage policy
CREATE POLICY "Give public access to advertisement images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'advertisements');

CREATE POLICY "Allow authenticated users to manage advertisement images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'advertisements')
  WITH CHECK (bucket_id = 'advertisements');