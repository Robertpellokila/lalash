/*
# Add service images and landing page CMS

1. Schema Changes
   - Add `image_url` column to `services` table (text, nullable) — stores the URL of a service image uploaded to Supabase Storage.
   - Create `landing_content` table — stores editable landing page content as a single row:
     - `hero_title` (text) — main heading on the landing page
     - `hero_subtitle` (text) — subheading below the hero title
     - `hero_badge` (text) — small badge text above the hero title (e.g. "Premium Lash Studio")
     - `hero_image_url` (text) — hero section image URL
     - `gallery_image_1`, `gallery_image_2`, `gallery_image_3` (text) — gallery section image URLs
     - `feature_1_title`, `feature_1_desc`, `feature_2_title`, `feature_2_desc`, `feature_3_title`, `feature_3_desc` (text) — features section
     - `cta_title` (text) — call-to-action section heading
     - `cta_subtitle` (text) — call-to-action section subheading
     - `footer_tagline` (text) — optional footer tagline
     - `updated_at` (timestamptz)

2. Security
   - `services.image_url`: covered by existing service RLS policies (authenticated write, public read of active services).
   - `landing_content`: public read (anon + authenticated), authenticated write only.

3. Storage
   - Create a public storage bucket `service-images` for uploading service photos.
   - Create a public storage bucket `landing-images` for uploading landing page photos.
   - Storage policies: public read for both buckets; authenticated write for both buckets.

4. Seed Data
   - Insert a default row into `landing_content` with placeholder text matching the current landing page.
*/

-- Add image_url to services
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE services ADD COLUMN image_url text;
  END IF;
END $$;

-- Create landing_content table
CREATE TABLE IF NOT EXISTS landing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_badge text NOT NULL DEFAULT 'Premium Lash Studio',
  hero_title text NOT NULL DEFAULT 'Beautiful lashes, effortlessly booked',
  hero_subtitle text NOT NULL DEFAULT 'Book your lash appointment online in just a few taps. Choose your service, pick a time, and we''ll handle the rest.',
  hero_image_url text,
  gallery_image_1 text,
  gallery_image_2 text,
  gallery_image_3 text,
  feature_1_title text NOT NULL DEFAULT 'Easy Online Booking',
  feature_1_desc text NOT NULL DEFAULT 'Pick your service and time in under a minute — no calls needed.',
  feature_2_title text NOT NULL DEFAULT 'Flexible Scheduling',
  feature_2_desc text NOT NULL DEFAULT 'Choose from available slots that fit your busy lifestyle.',
  feature_3_title text NOT NULL DEFAULT 'Expert Care',
  feature_3_desc text NOT NULL DEFAULT 'Professional lash treatments tailored to your unique style.',
  cta_title text NOT NULL DEFAULT 'Ready to book?',
  cta_subtitle text NOT NULL DEFAULT 'Schedule your lash appointment online today. It only takes a minute.',
  footer_tagline text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_landing_content" ON landing_content;
CREATE POLICY "public_read_landing_content" ON landing_content FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_landing_content" ON landing_content;
CREATE POLICY "auth_insert_landing_content" ON landing_content FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_landing_content" ON landing_content;
CREATE POLICY "auth_update_landing_content" ON landing_content FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_landing_content" ON landing_content;
CREATE POLICY "auth_delete_landing_content" ON landing_content FOR DELETE
  TO authenticated USING (true);

-- updated_at trigger for landing_content
DROP TRIGGER IF EXISTS trigger_landing_content_updated_at ON landing_content;
CREATE TRIGGER trigger_landing_content_updated_at BEFORE UPDATE ON landing_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default landing_content row
INSERT INTO landing_content (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-images', 'landing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for service-images
DROP POLICY IF EXISTS "public_read_service_images" ON storage.objects;
CREATE POLICY "public_read_service_images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "auth_insert_service_images" ON storage.objects;
CREATE POLICY "auth_insert_service_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'service-images');

DROP POLICY IF EXISTS "auth_update_service_images" ON storage.objects;
CREATE POLICY "auth_update_service_images" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'service-images') WITH CHECK (bucket_id = 'service-images');

DROP POLICY IF EXISTS "auth_delete_service_images" ON storage.objects;
CREATE POLICY "auth_delete_service_images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'service-images');

-- Storage policies for landing-images
DROP POLICY IF EXISTS "public_read_landing_images" ON storage.objects;
CREATE POLICY "public_read_landing_images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'landing-images');

DROP POLICY IF EXISTS "auth_insert_landing_images" ON storage.objects;
CREATE POLICY "auth_insert_landing_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'landing-images');

DROP POLICY IF EXISTS "auth_update_landing_images" ON storage.objects;
CREATE POLICY "auth_update_landing_images" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'landing-images') WITH CHECK (bucket_id = 'landing-images');

DROP POLICY IF EXISTS "auth_delete_landing_images" ON storage.objects;
CREATE POLICY "auth_delete_landing_images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'landing-images');
