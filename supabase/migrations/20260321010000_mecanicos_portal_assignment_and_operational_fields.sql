-- Base de fechamento por mecânico + indicadores operacionais
-- Compatível com ambientes já existentes

alter table if exists public.mecanicos
  add column if not exists codigo_acesso text,
  add column if not exists senha_acesso text,
  add column if not exists escala_trabalho text,
  add column if not exists folgas_planejadas text,
  add column if not exists ferias_inicio date,
  add column if not exists ferias_fim date,
  add column if not exists ultimo_login_portal timestamptz;

alter table if exists public.ordens_servico
  add column if not exists mecanico_responsavel_id uuid,
  add column if not exists mecanico_responsavel_codigo text;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'mecanicos'
  ) then
    begin
      alter table public.ordens_servico
        add constraint ordens_servico_mecanico_responsavel_fk
        foreign key (mecanico_responsavel_id) references public.mecanicos(id) on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create index if not exists idx_mecanicos_empresa_codigo_acesso
  on public.mecanicos (empresa_id, codigo_acesso);

create index if not exists idx_ordens_servico_empresa_mecanico_resp
  on public.ordens_servico (empresa_id, mecanico_responsavel_id);

create index if not exists idx_ordens_servico_empresa_mecanico_codigo
  on public.ordens_servico (empresa_id, mecanico_responsavel_codigo);

-- Melhorias: marcação de padronização (fase final do workflow)
alter table if exists public.melhorias
  add column if not exists padronizada boolean not null default false;

-- Preventiva: flexibilidade operacional de execução
alter table if exists public.planos_preventivos
  add column if not exists tolerancia_antes_dias integer,
  add column if not exists tolerancia_depois_dias integer;
