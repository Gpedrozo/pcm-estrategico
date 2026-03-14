-- Garante slug + dominio_custom para todas as empresas
-- Padrao: <slug>.gppis.com.br
-- Idempotente.

begin;

-- 1) Normaliza/preenche slug ausente nas empresas
update public.empresas e
set slug = left(
  regexp_replace(
    lower(coalesce(nullif(e.slug, ''), nullif(e.nome, ''), e.id::text)),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  48
)
where coalesce(nullif(e.slug, ''), '') = '';

-- remove hifens nas pontas gerados pela normalizacao
update public.empresas
set slug = regexp_replace(slug, '(^-|-$)', '', 'g')
where slug is not null;

-- fallback extremo para slug vazio apos limpeza
update public.empresas
set slug = left('empresa-' || replace(id::text, '-', ''), 48)
where coalesce(nullif(slug, ''), '') = '';

-- 2) Garante registro em empresa_config para cada empresa
insert into public.empresa_config (empresa_id, dominio_custom)
select e.id, lower(e.slug) || '.gppis.com.br'
from public.empresas e
left join public.empresa_config ec on ec.empresa_id = e.id
where ec.empresa_id is null
  and coalesce(nullif(e.slug, ''), '') <> '';

-- 3) Preenche dominio_custom vazio
update public.empresa_config ec
set dominio_custom = lower(e.slug) || '.gppis.com.br'
from public.empresas e
where e.id = ec.empresa_id
  and coalesce(nullif(ec.dominio_custom, ''), '') = ''
  and coalesce(nullif(e.slug, ''), '') <> '';

-- 4) Diagnostico final
select
  e.id as empresa_id,
  e.nome,
  e.slug,
  ec.dominio_custom
from public.empresas e
left join public.empresa_config ec on ec.empresa_id = e.id
order by e.nome nulls last, e.id;

commit;
