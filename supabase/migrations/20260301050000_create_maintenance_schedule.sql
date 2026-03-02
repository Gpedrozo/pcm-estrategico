-- Agenda central de manutenção programada

CREATE TABLE IF NOT EXISTS public.maintenance_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_current_empresa_id() REFERENCES public.empresas(id),
  tipo text NOT NULL CHECK (tipo IN ('preventiva', 'lubrificacao', 'inspecao', 'preditiva')),
  origem_id uuid NOT NULL,
  equipamento_id uuid,
  titulo text NOT NULL,
  descricao text,
  data_programada timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'programado',
  responsavel text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_schedule_tipo_origem
  ON public.maintenance_schedule (tipo, origem_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_empresa_data
  ON public.maintenance_schedule (empresa_id, data_programada);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_status
  ON public.maintenance_schedule (status);

ALTER TABLE public.maintenance_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.maintenance_schedule;
DROP POLICY IF EXISTS tenant_insert ON public.maintenance_schedule;
DROP POLICY IF EXISTS tenant_update ON public.maintenance_schedule;
DROP POLICY IF EXISTS tenant_delete ON public.maintenance_schedule;

CREATE POLICY tenant_select ON public.maintenance_schedule
  FOR SELECT USING (public.is_master_ti() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_insert ON public.maintenance_schedule
  FOR INSERT WITH CHECK (public.is_master_ti() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_update ON public.maintenance_schedule
  FOR UPDATE USING (public.is_master_ti() OR empresa_id = public.get_current_empresa_id())
  WITH CHECK (public.is_master_ti() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY tenant_delete ON public.maintenance_schedule
  FOR DELETE USING (public.is_master_ti() OR empresa_id = public.get_current_empresa_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enforce_empresa_id_protection') THEN
    DROP TRIGGER IF EXISTS trg_enforce_empresa_id ON public.maintenance_schedule;
    CREATE TRIGGER trg_enforce_empresa_id
      BEFORE INSERT OR UPDATE ON public.maintenance_schedule
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_empresa_id_protection();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_enterprise_audit') THEN
    DROP TRIGGER IF EXISTS trg_enterprise_audit ON public.maintenance_schedule;
    CREATE TRIGGER trg_enterprise_audit
      AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_schedule
      FOR EACH ROW
      EXECUTE FUNCTION public.log_enterprise_audit();
  END IF;
END $$;

-- Campos padronizados no plano de lubrificação (compatível com versão atual)
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS ponto_lubrificacao text;
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS lubrificante text;
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS periodicidade integer;
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS tipo_periodicidade text
  CHECK (tipo_periodicidade IN ('dias', 'semanas', 'meses', 'horas'));
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS tempo_estimado integer;
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS prioridade text
  CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica'));
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS ultima_execucao timestamptz;
ALTER TABLE public.planos_lubrificacao ADD COLUMN IF NOT EXISTS status text;

UPDATE public.planos_lubrificacao
SET
  descricao = COALESCE(descricao, observacoes),
  ponto_lubrificacao = COALESCE(ponto_lubrificacao, ponto),
  lubrificante = COALESCE(lubrificante, tipo_lubrificante),
  periodicidade = COALESCE(periodicidade, periodicidade_valor),
  tipo_periodicidade = COALESCE(tipo_periodicidade, lower(periodicidade_tipo)),
  tempo_estimado = COALESCE(tempo_estimado, tempo_estimado_min),
  prioridade = COALESCE(prioridade, 'media'),
  status = COALESCE(status, CASE WHEN ativo THEN 'programado' ELSE 'inativo' END)
WHERE true;

-- Backfill da agenda para registros existentes
INSERT INTO public.maintenance_schedule (
  empresa_id,
  tipo,
  origem_id,
  equipamento_id,
  titulo,
  descricao,
  data_programada,
  status,
  responsavel
)
SELECT
  pp.empresa_id,
  'preventiva',
  pp.id,
  pp.equipamento_id,
  CONCAT(pp.codigo, ' • ', pp.nome),
  pp.descricao,
  COALESCE(pp.proxima_execucao, now()),
  CASE WHEN COALESCE(pp.ativo, true) THEN 'programado' ELSE 'inativo' END,
  pp.responsavel_nome
FROM public.planos_preventivos pp
ON CONFLICT (tipo, origem_id)
DO UPDATE SET
  equipamento_id = EXCLUDED.equipamento_id,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  data_programada = EXCLUDED.data_programada,
  status = EXCLUDED.status,
  responsavel = EXCLUDED.responsavel;

INSERT INTO public.maintenance_schedule (
  empresa_id,
  tipo,
  origem_id,
  equipamento_id,
  titulo,
  descricao,
  data_programada,
  status,
  responsavel
)
SELECT
  pl.empresa_id,
  'lubrificacao',
  pl.id,
  pl.equipamento_id,
  CONCAT(pl.codigo, ' • ', pl.nome),
  COALESCE(pl.descricao, pl.observacoes),
  COALESCE(pl.proxima_execucao, now()),
  COALESCE(pl.status, CASE WHEN COALESCE(pl.ativo, true) THEN 'programado' ELSE 'inativo' END),
  COALESCE(pl.responsavel_nome, pl.responsavel)
FROM public.planos_lubrificacao pl
ON CONFLICT (tipo, origem_id)
DO UPDATE SET
  equipamento_id = EXCLUDED.equipamento_id,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  data_programada = EXCLUDED.data_programada,
  status = EXCLUDED.status,
  responsavel = EXCLUDED.responsavel;

INSERT INTO public.maintenance_schedule (
  empresa_id,
  tipo,
  origem_id,
  equipamento_id,
  titulo,
  descricao,
  data_programada,
  status,
  responsavel
)
SELECT
  i.empresa_id,
  'inspecao',
  i.id,
  null,
  CONCAT('Inspeção #', i.numero_inspecao, ' • ', i.rota_nome),
  i.descricao,
  (i.data_inspecao::timestamptz + interval '8 hour'),
  COALESCE(i.status, 'programado'),
  i.inspetor_nome
FROM public.inspecoes i
ON CONFLICT (tipo, origem_id)
DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  data_programada = EXCLUDED.data_programada,
  status = EXCLUDED.status,
  responsavel = EXCLUDED.responsavel;

INSERT INTO public.maintenance_schedule (
  empresa_id,
  tipo,
  origem_id,
  equipamento_id,
  titulo,
  descricao,
  data_programada,
  status,
  responsavel
)
SELECT
  mp.empresa_id,
  'preditiva',
  mp.id,
  mp.equipamento_id,
  CONCAT(mp.tag, ' • ', mp.tipo_medicao),
  mp.observacoes,
  COALESCE(mp.created_at, now()),
  COALESCE(mp.status, 'programado'),
  mp.responsavel_nome
FROM public.medicoes_preditivas mp
ON CONFLICT (tipo, origem_id)
DO UPDATE SET
  equipamento_id = EXCLUDED.equipamento_id,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  data_programada = EXCLUDED.data_programada,
  status = EXCLUDED.status,
  responsavel = EXCLUDED.responsavel;
