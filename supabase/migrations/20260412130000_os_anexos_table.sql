-- Migration: Create os_anexos table for file attachments on OS closing
-- Supports upload of checklist scans and evidence documents for preventive/lubrification/inspection OS

CREATE TABLE IF NOT EXISTS public.os_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  url text NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'documento',
  tamanho_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by OS
CREATE INDEX IF NOT EXISTS idx_os_anexos_os_id ON public.os_anexos (os_id);
CREATE INDEX IF NOT EXISTS idx_os_anexos_empresa ON public.os_anexos (empresa_id);

-- RLS
ALTER TABLE public.os_anexos ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "os_anexos_tenant_isolation" ON public.os_anexos
  USING (empresa_id = (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'empresa_id'),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id')
    )::uuid
  ));

-- Insert policy
CREATE POLICY "os_anexos_insert" ON public.os_anexos
  FOR INSERT WITH CHECK (empresa_id = (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'empresa_id'),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id')
    )::uuid
  ));

-- Add 'attachments' bucket to storage allowed list if not present
-- Note: The bucket 'attachments' already exists for mobile OS photos
-- No storage migration needed

COMMENT ON TABLE public.os_anexos IS 'Anexos de Ordem de Serviço (checklists, evidências, documentos)';
