-- Create the organization_assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'organization_assets', 
  'organization_assets', 
  true, 
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policies for the bucket
CREATE POLICY "Organization owners can upload assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'organization_assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Organization owners can update assets" 
ON storage.objects FOR UPDATE 
WITH CHECK (
  bucket_id = 'organization_assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Organization owners can delete assets" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'organization_assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view organization assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'organization_assets');