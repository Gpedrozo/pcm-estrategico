-- Diagnostico rapido para erro: "Dominio nao autorizado para login"
-- Altere os valores abaixo conforme necessario.

-- 0) Parametros
WITH params AS (
  SELECT
    'nelcinda.gppis.com.br'::text AS host,
    'nelcinda'::text AS slug,
    NULL::text AS user_email
)
SELECT * FROM params;

-- 1) Empresa configurada por dominio_custom
WITH params AS (
  SELECT 'nelcinda.gppis.com.br'::text AS host
)
SELECT
  ec.empresa_id,
  ec.dominio_custom,
  ec.updated_at,
  e.slug,
  e.nome,
  COALESCE(
    (to_jsonb(e) ->> 'ativo')::boolean,
    (to_jsonb(e) ->> 'is_active')::boolean
  ) AS empresa_ativa
FROM public.empresa_config ec
JOIN public.empresas e ON e.id = ec.empresa_id
JOIN params p ON lower(ec.dominio_custom) = lower(p.host);

-- 2) Empresa configurada por slug (fallback do frontend)
WITH params AS (
  SELECT 'nelcinda'::text AS slug
)
SELECT
  e.id AS empresa_id,
  e.slug,
  e.nome,
  COALESCE(
    (to_jsonb(e) ->> 'ativo')::boolean,
    (to_jsonb(e) ->> 'is_active')::boolean
  ) AS empresa_ativa,
  e.created_at,
  e.updated_at
FROM public.empresas e
JOIN params p ON lower(e.slug) = lower(p.slug);

-- 3) Inconsistencia entre dominio_custom e slug
-- Se retornar linha, slug e dominio apontam para empresas diferentes.
WITH domain_match AS (
  SELECT ec.empresa_id
  FROM public.empresa_config ec
  WHERE lower(ec.dominio_custom) = lower('nelcinda.gppis.com.br')
  LIMIT 1
),
slug_match AS (
  SELECT e.id AS empresa_id
  FROM public.empresas e
  WHERE lower(e.slug) = lower('nelcinda')
  LIMIT 1
)
SELECT
  dm.empresa_id AS empresa_por_dominio,
  sm.empresa_id AS empresa_por_slug,
  (dm.empresa_id IS NOT NULL AND sm.empresa_id IS NOT NULL AND dm.empresa_id = sm.empresa_id) AS consistente
FROM domain_match dm
FULL OUTER JOIN slug_match sm ON true;

-- 4) Policy publica de lookup de dominio em empresa_config
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'empresa_config'
  AND policyname IN ('empresa_config_domain_lookup_public', 'empresa_config_tenant_or_master')
ORDER BY policyname;

-- 5) Membership do usuario na empresa do subdominio (opcional)
-- Substitua o email no CTE params para validar um usuario especifico.
WITH params AS (
  SELECT 'usuario@empresa.com'::text AS user_email
),
usr AS (
  SELECT id, email
  FROM auth.users a
  JOIN params p ON lower(a.email) = lower(p.user_email)
  LIMIT 1
),
empresa_host AS (
  SELECT ec.empresa_id
  FROM public.empresa_config ec
  WHERE lower(ec.dominio_custom) = lower('nelcinda.gppis.com.br')
  LIMIT 1
)
SELECT
  u.email,
  eh.empresa_id AS empresa_subdominio,
  p.empresa_id AS empresa_profile,
  ur.empresa_id AS empresa_role,
  ur.role
FROM usr u
LEFT JOIN empresa_host eh ON true
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY ur.created_at NULLS LAST;

-- 6) Auditoria geral de isolamento tenant (script oficial do repo)
-- Rode separadamente: docs/TENANT_VALIDACAO_OPERACIONAL_20260312.sql
