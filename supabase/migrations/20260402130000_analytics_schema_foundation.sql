-- Migration: Analytics Schema Foundation
-- Date: 2026-04-02
-- Purpose: Create BI-ready layer with star schema (facts + dimensions)
-- Impact: Power BI can connect directly, dashboards go from hardcoded to dynamic

BEGIN;

-- ======================
-- Create Analytics Schema
-- ======================

CREATE SCHEMA IF NOT EXISTS analytics;

-- ======================
-- Dimension: Tempo (Date/Time)
-- ======================

CREATE TABLE IF NOT EXISTS analytics.dim_tempo (
  data_id INT PRIMARY KEY,
  data DATE UNIQUE,
  ano INT,
  mes INT,
  mes_nome VARCHAR(20),
  dia_semana INT,
  dia_semana_nome VARCHAR(20),
  semana_ano INT,
  trimestre INT,
  eh_fim_de_semana BOOLEAN,
  eh_feriadado BOOLEAN
);

INSERT INTO analytics.dim_tempo
SELECT
  TO_CHAR(date_series, 'YYYYMMDD')::INT as data_id,
  date_series as data,
  EXTRACT(YEAR FROM date_series)::INT as ano,
  EXTRACT(MONTH FROM date_series)::INT as mes,
  TO_CHAR(date_series, 'TMMonth') as mes_nome,
  EXTRACT(DOW FROM date_series)::INT as dia_semana,
  TO_CHAR(date_series, 'TMDay') as dia_semana_nome,
  EXTRACT(WEEK FROM date_series)::INT as semana_ano,
  EXTRACT(QUARTER FROM date_series)::INT as trimestre,
  EXTRACT(DOW FROM date_series) IN (0, 6) as eh_fim_de_semana,
  FALSE as eh_feriadado
FROM GENERATE_SERIES('2024-01-01', '2027-12-31', INTERVAL '1 day') AS t(date_series)
ON CONFLICT DO NOTHING;

-- ======================
-- Dimension: Empresa
-- ======================

CREATE TABLE IF NOT EXISTS analytics.dim_empresa (
  empresa_id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  slug TEXT,
  ativa BOOLEAN,
  nivel_licenca TEXT,
  data_criacao DATE,
  data_cancelamento DATE
);

-- Synchronize with source
TRUNCATE analytics.dim_empresa;
INSERT INTO analytics.dim_empresa
SELECT
  id,
  nome,
  cnpj,
  slug,
  ativa,
  COALESCE((config->'plano'->>'tipo'), 'free') as nivel_licenca,
  created_at::DATE,
  CASE WHEN status = 'cancelada' THEN updated_at::DATE END
FROM empresas
ON CONFLICT (empresa_id) DO UPDATE SET
  nome = EXCLUDED.nome,
  ativa = EXCLUDED.ativa,
  nivel_licenca = EXCLUDED.nivel_licenca;

-- ======================
-- Dimension: Equipamento
-- ======================

CREATE TABLE IF NOT EXISTS analytics.dim_equipamento (
  equipamento_id UUID PRIMARY KEY,
  empresa_id UUID,
  nome TEXT,
  tipo TEXT,
  fabricante TEXT,
  modelo TEXT,
  localizacao TEXT,
  status TEXT
);

-- ======================
-- Dimension: Tipo Manutenção
-- ======================

CREATE TABLE IF NOT EXISTS analytics.dim_tipo_manutencao (
  tipo_id INT PRIMARY KEY,
  tipo TEXT UNIQUE,
  categoria TEXT
);

INSERT INTO analytics.dim_tipo_manutencao (tipo_id, tipo, categoria) VALUES
  (1, 'Corretiva', 'Reativa'),
  (2, 'Preventiva', 'Proativa'),
  (3, 'Preditiva', 'Proativa'),
  (4, 'Lubrificação', 'Preventiva'),
  (5, 'Inspeção', 'Preventiva'),
  (6, 'Manutenção Emergencial', 'Urgente')
ON CONFLICT DO NOTHING;

-- ======================
-- Dimension: Status OS
-- ======================

CREATE TABLE IF NOT EXISTS analytics.dim_status_os (
  status_id INT PRIMARY KEY,
  status TEXT UNIQUE,
  categoria TEXT
);

INSERT INTO analytics.dim_status_os (status_id, status, categoria) VALUES
  (1, 'solicitada', 'aberta'),
  (2, 'emitida', 'aberta'),
  (3, 'em_execucao', 'emprocesso'),
  (4, 'pausada', 'emprocesso'),
  (5, 'concluida', 'fechada'),
  (6, 'cancelada', 'fechada'),
  (7, 'aguardando_materiais', 'emprocesso')
ON CONFLICT DO NOTHING;

-- ======================
-- Fact: Ordens de Serviço
-- ======================

CREATE TABLE IF NOT EXISTS analytics.fato_ordens_servico (
  os_id UUID PRIMARY KEY,
  empresa_id UUID,
  data_id_solicitacao INT,
  data_id_emissao INT,
  data_id_conclusao INT,
  data_id_target INT,
  
  -- Dimensions
  status_id INT REFERENCES analytics.dim_status_os(status_id),
  tipo_id INT REFERENCES analytics.dim_tipo_manutencao(tipo_id),
  equipamento_id UUID,
  
  -- Metrics
  custo_estimado NUMERIC(12,2),
  custo_real NUMERIC(12,2),
  tempo_planejado_horas NUMERIC(10,2),
  tempo_real_horas NUMERIC(10,2),
  
  -- Flags
  atrasada BOOLEAN,
  excedido_orc BOOLEAN,
  
  -- Audit
  criada_em TIMESTAMP,
  atualizada_em TIMESTAMP,
  
  FOREIGN KEY (empresa_id) REFERENCES analytics.dim_empresa(empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_fato_os_empresa_data
ON analytics.fato_ordens_servico(empresa_id, data_id_conclusao);

-- ======================
-- Fact: Execuções (Tempo de Mecânico)
-- ======================

CREATE TABLE IF NOT EXISTS analytics.fato_execucoes (
  execucao_id UUID PRIMARY KEY,
  os_id UUID,
  empresa_id UUID,
  
  data_id_inicial INT,
  data_id_final INT,
  
  duracao_minutos INT,
  custo_mao_obra NUMERIC(12,2),
  
  FOREIGN KEY (empresa_id) REFERENCES analytics.dim_empresa(empresa_id)
);

-- ======================
-- Fact: Custos Operacionais
-- ======================

CREATE TABLE IF NOT EXISTS analytics.fato_custos (
  custo_id UUID PRIMARY KEY,
  empresa_id UUID,
  os_id UUID,
  
  data_id INT REFERENCES analytics.dim_tempo(data_id),
  
  tipo_custo TEXT,  -- material, mao_obra, ferramental, viajem, outros
  descricao TEXT,
  valor NUMERIC(12,2),
  
  FOREIGN KEY (empresa_id) REFERENCES analytics.dim_empresa(empresa_id)
);

-- ======================
-- ETL Job View: Ordens para Fato
-- ======================

CREATE OR REPLACE VIEW analytics.v_carga_fatos_os AS
SELECT
  os.id as os_id,
  os.empresa_id,
  TO_CHAR(os.data_solicitacao, 'YYYYMMDD')::INT as data_id_solicitacao,
  TO_CHAR(COALESCE(os.data_emissao, NOW()), 'YYYYMMDD')::INT as data_id_emissao,
  TO_CHAR(os.data_conclusao, 'YYYYMMDD')::INT as data_id_conclusao,
  TO_CHAR(os.dataAlvo, 'YYYYMMDD')::INT as data_id_target,
  
  dst.status_id,
  dtm.tipo_id,
  os.equipamento_id,
  
  os.custoEstimado,
  os.custoRealizado,
  os.tempoEstimado,
  os.tempoRealizado,
  
  (os.data_conclusao > os.dataAlvo) as atrasada,
  (os.custoRealizado > os.custoEstimado) as excedido_orc,
  
  os.created_at,
  os.updated_at
FROM ordensServico os
LEFT JOIN analytics.dim_status_os dst ON dst.status = os.status
LEFT JOIN analytics.dim_tipo_manutencao dtm ON dtm.tipo = os.tipo;

-- ======================
-- Grant Permissions
-- ======================

GRANT USAGE ON SCHEMA analytics TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated, anon;
GRANT SELECT ON ALL VIEWS IN SCHEMA analytics TO authenticated, anon;

COMMIT;
