-- Compatibilidade de schema para medicoes preditivas em ambientes legados.
alter table if exists public.medicoes_preditivas
  add column if not exists tipo_medicao text,
  add column if not exists valor numeric(14,4),
  add column if not exists unidade text,
  add column if not exists limite_alerta numeric(14,4),
  add column if not exists limite_critico numeric(14,4),
  add column if not exists observacoes text;

-- Preenche unidade padrao em registros antigos.
update public.medicoes_preditivas
set unidade = coalesce(nullif(unidade, ''), 'UN')
where unidade is null or unidade = '';
