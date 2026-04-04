-- Fase 1: Adiciona campos de soft-delete na tabela profiles
-- status: 'ativo' | 'inativo' | 'excluido'
-- deleted_at: timestamp de quando foi excluído
-- deleted_by: quem excluiu (auditoria)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Constraint de valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('ativo', 'inativo', 'excluido'));
  END IF;
END $$;

-- FK para rastrear quem excluiu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_status ON public.profiles(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Sincronizar status inicial: marcar como 'inativo' os usuários que já estão bannidos no auth
-- Isso será feito pela edge function na próxima listagem, não precisamos de UPDATE em massa aqui
-- pois não temos acesso ao auth.users diretamente via migration SQL padrão.

COMMENT ON COLUMN public.profiles.status IS 'Status do usuário: ativo, inativo, excluido';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp de exclusão lógica (soft delete)';
COMMENT ON COLUMN public.profiles.deleted_by IS 'ID do owner_master que excluiu o usuário';
