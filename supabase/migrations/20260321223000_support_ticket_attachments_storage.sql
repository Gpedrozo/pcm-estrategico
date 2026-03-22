BEGIN;

INSERT INTO storage.buckets (id, name, public)
SELECT 'support-attachments', 'support-attachments', true
WHERE NOT EXISTS (
  SELECT 1
  FROM storage.buckets
  WHERE id = 'support-attachments'
);

DROP POLICY IF EXISTS "Authenticated users can view support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update own support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete own support attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'support-attachments');

CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND owner = auth.uid()
);

CREATE POLICY "Owners can update own support attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'support-attachments'
  AND owner = auth.uid()
);

CREATE POLICY "Owners can delete own support attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND owner = auth.uid()
);

COMMIT;
