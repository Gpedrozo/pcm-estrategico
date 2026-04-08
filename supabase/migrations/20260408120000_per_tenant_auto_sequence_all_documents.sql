-- ============================================================
-- Migration: Per-tenant sequential auto-numbering for ALL documents
-- Date: 2026-04-08
-- Phases: 0 (RPC), 1 (Triggers), 2 (Renumbering)
--
-- SAFE: idempotent, transactional, rollback-friendly
-- Does NOT drop any column — only adds BEFORE INSERT triggers
-- Existing SERIAL/IDENTITY columns remain; trigger overrides value
-- ============================================================

BEGIN;

-- =============================================
-- PHASE 0: Atomic RPC — next_tenant_sequence()
-- =============================================

CREATE OR REPLACE FUNCTION public.next_tenant_sequence(
  p_empresa_id uuid,
  p_tipo text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero integer;
  v_prefixo text;
BEGIN
  -- Resolve prefix
  v_prefixo := CASE p_tipo
    WHEN 'ORDEM_SERVICO'     THEN 'OS'
    WHEN 'SOLICITACAO'        THEN 'SS'
    WHEN 'INSPECAO'           THEN 'IN'
    WHEN 'PERMISSAO_TRABALHO' THEN 'PT'
    WHEN 'INCIDENTE'          THEN 'IC'
    WHEN 'RCA'                THEN 'RCA'
    WHEN 'MELHORIA'           THEN 'ML'
    WHEN 'CONTRATO'           THEN 'CT'
    WHEN 'FORNECEDOR'         THEN 'FN'
    WHEN 'LUBRIFICANTE'       THEN 'EL'
    WHEN 'ROTA_LUB'           THEN 'RL'
    WHEN 'PREVENTIVA'         THEN 'PR'
    WHEN 'LUBRIFICACAO'       THEN 'LB'
    ELSE LEFT(p_tipo, 3)
  END;

  -- Ensure row exists (idempotent)
  INSERT INTO public.document_sequences (empresa_id, tipo_documento, prefixo, proximo_numero)
  VALUES (p_empresa_id, p_tipo, v_prefixo, 1)
  ON CONFLICT (empresa_id, tipo_documento) DO NOTHING;

  -- Atomic increment + return current number
  UPDATE public.document_sequences
  SET proximo_numero = proximo_numero + 1,
      updated_at = now()
  WHERE empresa_id = p_empresa_id
    AND tipo_documento = p_tipo
  RETURNING proximo_numero - 1 INTO v_numero;

  RETURN v_numero;
END;
$$;

-- Grant execute to authenticated + service_role
GRANT EXECUTE ON FUNCTION public.next_tenant_sequence(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_tenant_sequence(uuid, text) TO service_role;


-- =============================================
-- PHASE 1: Generic BEFORE INSERT trigger function
-- =============================================

CREATE OR REPLACE FUNCTION public.trg_auto_tenant_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
  v_tipo text;
  v_prefixo text;
BEGIN
  -- Map table name to sequence type
  CASE TG_TABLE_NAME
    WHEN 'ordens_servico'          THEN v_tipo := 'ORDEM_SERVICO';     v_prefixo := 'OS';
    WHEN 'solicitacoes_manutencao' THEN v_tipo := 'SOLICITACAO';        v_prefixo := 'SS';
    WHEN 'inspecoes'               THEN v_tipo := 'INSPECAO';           v_prefixo := 'IN';
    WHEN 'permissoes_trabalho'     THEN v_tipo := 'PERMISSAO_TRABALHO'; v_prefixo := 'PT';
    WHEN 'incidentes_ssma'         THEN v_tipo := 'INCIDENTE';          v_prefixo := 'IC';
    WHEN 'analise_causa_raiz'      THEN v_tipo := 'RCA';                v_prefixo := 'RCA';
    WHEN 'melhorias'               THEN v_tipo := 'MELHORIA';           v_prefixo := 'ML';
    WHEN 'contratos'               THEN v_tipo := 'CONTRATO';           v_prefixo := 'CT';
    WHEN 'fornecedores'            THEN v_tipo := 'FORNECEDOR';         v_prefixo := 'FN';
    WHEN 'lubrificantes'           THEN v_tipo := 'LUBRIFICANTE';       v_prefixo := 'EL';
    WHEN 'rotas_lubrificacao'      THEN v_tipo := 'ROTA_LUB';           v_prefixo := 'RL';
    ELSE RETURN NEW;  -- unknown table, do nothing
  END CASE;

  -- Get next per-tenant number
  v_seq := public.next_tenant_sequence(NEW.empresa_id, v_tipo);

  -- Assign to the correct column per table
  CASE TG_TABLE_NAME
    WHEN 'ordens_servico'          THEN NEW.numero_os          := v_seq;
    WHEN 'solicitacoes_manutencao' THEN NEW.numero_solicitacao  := v_seq;
    WHEN 'inspecoes'               THEN NEW.numero_inspecao     := v_seq;
    WHEN 'permissoes_trabalho'     THEN NEW.numero_pt           := v_seq;
    WHEN 'incidentes_ssma'         THEN NEW.numero_incidente    := v_seq;
    WHEN 'analise_causa_raiz'      THEN NEW.numero_rca          := v_seq;
    WHEN 'melhorias'               THEN NEW.numero_melhoria     := v_seq;
    WHEN 'contratos'               THEN NEW.numero_contrato     := v_prefixo || '-' || LPAD(v_seq::text, 6, '0');
    WHEN 'fornecedores'            THEN NEW.codigo              := v_prefixo || '-' || LPAD(v_seq::text, 6, '0');
    WHEN 'lubrificantes'           THEN NEW.codigo              := v_prefixo || '-' || LPAD(v_seq::text, 6, '0');
    WHEN 'rotas_lubrificacao'      THEN NEW.codigo              := v_prefixo || '-' || LPAD(v_seq::text, 6, '0');
    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;


-- =============================================
-- PHASE 1b: Create triggers on all tables
-- Drop old sync triggers first (they reference ultimo_numero which may not exist)
-- =============================================

-- Drop old AFTER INSERT sync triggers (safe even if they don't exist)
DROP TRIGGER IF EXISTS tr_sync_os_sequence         ON public.ordens_servico;
DROP TRIGGER IF EXISTS tr_sync_inspecoes_sequence   ON public.inspecoes;
DROP TRIGGER IF EXISTS tr_sync_preventiva_sequence  ON public.planos_preventivos;
DROP TRIGGER IF EXISTS tr_sync_lubrificacao_sequence ON public.planos_lubrificacao;

-- Drop any previous auto-seq triggers (idempotent)
DROP TRIGGER IF EXISTS trg_auto_seq ON public.ordens_servico;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.solicitacoes_manutencao;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.inspecoes;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.permissoes_trabalho;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.incidentes_ssma;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.analise_causa_raiz;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.melhorias;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.contratos;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.fornecedores;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.lubrificantes;
DROP TRIGGER IF EXISTS trg_auto_seq ON public.rotas_lubrificacao;

-- Create BEFORE INSERT triggers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ordens_servico') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.ordens_servico
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='solicitacoes_manutencao') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.solicitacoes_manutencao
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inspecoes') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.inspecoes
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permissoes_trabalho') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.permissoes_trabalho
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='incidentes_ssma') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.incidentes_ssma
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analise_causa_raiz') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.analise_causa_raiz
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='melhorias') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.melhorias
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contratos') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.contratos
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fornecedores') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.fornecedores
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lubrificantes') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.lubrificantes
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rotas_lubrificacao') THEN
    CREATE TRIGGER trg_auto_seq BEFORE INSERT ON public.rotas_lubrificacao
      FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tenant_sequence();
  END IF;
END $$;


-- =============================================
-- PHASE 2: Renumber existing data per-tenant
-- Uses ROW_NUMBER() ordered by created_at
-- Then syncs document_sequences.proximo_numero
-- =============================================

-- 2a. Renumber integer columns (SERIAL/IDENTITY tables)

-- ordens_servico
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ordens_servico') THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.ordens_servico
    )
    UPDATE public.ordens_servico t SET numero_os = n.seq
    FROM numbered n WHERE t.id = n.id AND t.numero_os IS DISTINCT FROM n.seq;
  END IF;
END $$;

-- solicitacoes_manutencao
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='solicitacoes_manutencao') THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.solicitacoes_manutencao
    )
    UPDATE public.solicitacoes_manutencao t SET numero_solicitacao = n.seq
    FROM numbered n WHERE t.id = n.id AND t.numero_solicitacao IS DISTINCT FROM n.seq;
  END IF;
END $$;

-- inspecoes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inspecoes') THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.inspecoes
    )
    UPDATE public.inspecoes t SET numero_inspecao = n.seq
    FROM numbered n WHERE t.id = n.id AND t.numero_inspecao IS DISTINCT FROM n.seq;
  END IF;
END $$;

-- permissoes_trabalho
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permissoes_trabalho') THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.permissoes_trabalho
    )
    UPDATE public.permissoes_trabalho t SET numero_pt = n.seq
    FROM numbered n WHERE t.id = n.id AND t.numero_pt IS DISTINCT FROM n.seq;
  END IF;
END $$;

-- incidentes_ssma
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='incidentes_ssma') THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.incidentes_ssma
    )
    UPDATE public.incidentes_ssma t SET numero_incidente = n.seq
    FROM numbered n WHERE t.id = n.id AND t.numero_incidente IS DISTINCT FROM n.seq;
  END IF;
END $$;

-- analise_causa_raiz
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analise_causa_raiz') THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.analise_causa_raiz
    )
    UPDATE public.analise_causa_raiz t SET numero_rca = n.seq
    FROM numbered n WHERE t.id = n.id AND t.numero_rca IS DISTINCT FROM n.seq;
  END IF;
END $$;

-- melhorias
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='melhorias') THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.melhorias
    )
    UPDATE public.melhorias t SET numero_melhoria = n.seq
    FROM numbered n WHERE t.id = n.id AND t.numero_melhoria IS DISTINCT FROM n.seq;
  END IF;
END $$;

-- 2b. Renumber varchar columns (format as PREFIX-000001)

-- contratos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contratos') THEN
    WITH numbered AS (
      SELECT id, empresa_id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.contratos
    )
    UPDATE public.contratos t SET numero_contrato = 'CT-' || LPAD(n.seq::text, 6, '0')
    FROM numbered n WHERE t.id = n.id;
  END IF;
END $$;

-- fornecedores
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fornecedores') THEN
    WITH numbered AS (
      SELECT id, empresa_id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.fornecedores
    )
    UPDATE public.fornecedores t SET codigo = 'FN-' || LPAD(n.seq::text, 6, '0')
    FROM numbered n WHERE t.id = n.id;
  END IF;
END $$;

-- lubrificantes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lubrificantes') THEN
    WITH numbered AS (
      SELECT id, empresa_id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.lubrificantes
    )
    UPDATE public.lubrificantes t SET codigo = 'EL-' || LPAD(n.seq::text, 6, '0')
    FROM numbered n WHERE t.id = n.id;
  END IF;
END $$;

-- rotas_lubrificacao
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rotas_lubrificacao') THEN
    WITH numbered AS (
      SELECT id, empresa_id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, id) AS seq
      FROM public.rotas_lubrificacao
    )
    UPDATE public.rotas_lubrificacao t SET codigo = 'RL-' || LPAD(n.seq::text, 6, '0')
    FROM numbered n WHERE t.id = n.id;
  END IF;
END $$;


-- 2c. Sync document_sequences.proximo_numero to MAX+1 for all entreprise/type combos

-- Helper function to sync one type
CREATE OR REPLACE FUNCTION public._sync_seq_for_type(
  p_tipo text,
  p_prefixo text,
  p_query text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN EXECUTE p_query
  LOOP
    INSERT INTO public.document_sequences (empresa_id, tipo_documento, prefixo, proximo_numero)
    VALUES (rec.empresa_id, p_tipo, p_prefixo, COALESCE(rec.max_num, 0) + 1)
    ON CONFLICT (empresa_id, tipo_documento)
    DO UPDATE SET proximo_numero = GREATEST(
      document_sequences.proximo_numero,
      COALESCE(rec.max_num, 0) + 1
    ), updated_at = now();
  END LOOP;
END;
$$;

-- Sync all integer-column types
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ordens_servico') THEN
    PERFORM public._sync_seq_for_type('ORDEM_SERVICO', 'OS',
      'SELECT empresa_id, MAX(numero_os) AS max_num FROM public.ordens_servico GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='solicitacoes_manutencao') THEN
    PERFORM public._sync_seq_for_type('SOLICITACAO', 'SS',
      'SELECT empresa_id, MAX(numero_solicitacao) AS max_num FROM public.solicitacoes_manutencao GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inspecoes') THEN
    PERFORM public._sync_seq_for_type('INSPECAO', 'IN',
      'SELECT empresa_id, MAX(numero_inspecao) AS max_num FROM public.inspecoes GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permissoes_trabalho') THEN
    PERFORM public._sync_seq_for_type('PERMISSAO_TRABALHO', 'PT',
      'SELECT empresa_id, MAX(numero_pt) AS max_num FROM public.permissoes_trabalho GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='incidentes_ssma') THEN
    PERFORM public._sync_seq_for_type('INCIDENTE', 'IC',
      'SELECT empresa_id, MAX(numero_incidente) AS max_num FROM public.incidentes_ssma GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analise_causa_raiz') THEN
    PERFORM public._sync_seq_for_type('RCA', 'RCA',
      'SELECT empresa_id, MAX(numero_rca) AS max_num FROM public.analise_causa_raiz GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='melhorias') THEN
    PERFORM public._sync_seq_for_type('MELHORIA', 'ML',
      'SELECT empresa_id, MAX(numero_melhoria) AS max_num FROM public.melhorias GROUP BY empresa_id');
  END IF;
END $$;

-- Sync varchar-column types (extract number from formatted code)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contratos') THEN
    PERFORM public._sync_seq_for_type('CONTRATO', 'CT',
      'SELECT empresa_id, COUNT(*)::integer AS max_num FROM public.contratos GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fornecedores') THEN
    PERFORM public._sync_seq_for_type('FORNECEDOR', 'FN',
      'SELECT empresa_id, COUNT(*)::integer AS max_num FROM public.fornecedores GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lubrificantes') THEN
    PERFORM public._sync_seq_for_type('LUBRIFICANTE', 'EL',
      'SELECT empresa_id, COUNT(*)::integer AS max_num FROM public.lubrificantes GROUP BY empresa_id');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rotas_lubrificacao') THEN
    PERFORM public._sync_seq_for_type('ROTA_LUB', 'RL',
      'SELECT empresa_id, COUNT(*)::integer AS max_num FROM public.rotas_lubrificacao GROUP BY empresa_id');
  END IF;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS public._sync_seq_for_type(text, text, text);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
