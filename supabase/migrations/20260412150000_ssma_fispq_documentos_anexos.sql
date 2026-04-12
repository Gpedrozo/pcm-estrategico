-- Migration: Adiciona coluna documentos_anexos na tabela fichas_seguranca
-- e cria índice para storage bucket 'documentos' (se não existir policy)

-- Coluna para armazenar documentos complementares enviados por fornecedores
ALTER TABLE fichas_seguranca
  ADD COLUMN IF NOT EXISTS documentos_anexos JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN fichas_seguranca.documentos_anexos IS
  'Array de documentos anexos do fornecedor: [{nome, tipo, url, data_upload, observacao}]';

-- Garante que o bucket documentos existe (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  20971520, -- 20 MB
  ARRAY['application/pdf','image/png','image/jpeg','image/jpg','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Policy SELECT pública (arquivos de FISPQ/documentos são acessíveis autenticados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'documentos_select_authenticated'
  ) THEN
    CREATE POLICY documentos_select_authenticated
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'documentos');
  END IF;
END$$;

-- Policy INSERT para authenticated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'documentos_insert_authenticated'
  ) THEN
    CREATE POLICY documentos_insert_authenticated
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'documentos');
  END IF;
END$$;

-- Policy UPDATE para authenticated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'documentos_update_authenticated'
  ) THEN
    CREATE POLICY documentos_update_authenticated
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'documentos');
  END IF;
END$$;
