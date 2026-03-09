-- Fix incremental: criar tabela faltante identificada pela auditoria total
-- Tabela: public.ai_root_cause_analysis
-- Data: 2026-03-08
-- Execução: Supabase SQL Editor (Run)

begin;

create table if not exists public.ai_root_cause_analysis (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  equipamento_id uuid references public.equipamentos(id),
  generated_at timestamptz not null default now(),
  summary text,
  possible_causes jsonb,
  main_hypothesis text,
  preventive_actions jsonb,
  criticality text,
  confidence_score numeric,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_root_cause_tag
  on public.ai_root_cause_analysis(tag);

create index if not exists idx_ai_root_cause_equip
  on public.ai_root_cause_analysis(equipamento_id);

alter table public.ai_root_cause_analysis enable row level security;

drop policy if exists "Authenticated users can view ai analysis" on public.ai_root_cause_analysis;
create policy "Authenticated users can view ai analysis"
on public.ai_root_cause_analysis
for select
using (true);

drop policy if exists "Authenticated users can create ai analysis" on public.ai_root_cause_analysis;
create policy "Authenticated users can create ai analysis"
on public.ai_root_cause_analysis
for insert
with check (true);

drop policy if exists "Authenticated users can delete ai analysis" on public.ai_root_cause_analysis;
create policy "Authenticated users can delete ai analysis"
on public.ai_root_cause_analysis
for delete
using (true);

grant select, insert, delete on public.ai_root_cause_analysis to authenticated;

grant all on public.ai_root_cause_analysis to service_role;

commit;
