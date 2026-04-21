-- Seed-only migration: Populate templates data for Compressor engines
-- This migration assumes tables already exist from 20260421_create_templates_atividades.sql

-- Atividade 1: Preparação e Segurança
INSERT INTO template_atividades_preventivas (empresa_id, nome, tipo_componente, descricao, ativo, ordem)
SELECT 
  empresas.id,
  'Preventiva Padrão - Compressor de Parafuso',
  'compressor',
  'Template de atividades para manutenção preventiva de compressor de parafuso com foco em componente recorrente e sinais preditivos.',
  true,
  1
FROM empresas
LIMIT 1
ON CONFLICT DO NOTHING;

-- Get template ID
WITH template_ids AS (
  SELECT id, empresa_id
  FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' 
    AND nome = 'Preventiva Padrão - Compressor de Parafuso'
  LIMIT 1
)

-- Insert Activity 1: Preparation & Safety
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT 
  t.id,
  t.empresa_id,
  '1. Preparação e Segurança',
  'Isolamento de energia e validação de segurança operacional.',
  1,
  30,
  true
FROM template_ids t
ON CONFLICT DO NOTHING;

-- Insert services for Activity 1
WITH atividade_1 AS (
  SELECT a.id, a.empresa_id FROM template_atividades_preventivas_atividades a
  JOIN template_atividades_preventivas t ON a.template_id = t.id
  WHERE t.tipo_componente = 'compressor' AND a.nome = '1. Preparação e Segurança' LIMIT 1
)
INSERT INTO template_atividades_preventivas_servicos
(atividade_template_id, empresa_id, descricao, tempo_estimado_min, ordem, criterio_aceite, evidencia_obrigatoria, especialidade, observacoes)
SELECT a.id, a.empresa_id, sv.descricao, sv.tempo, sv.ordem, sv.criterio, sv.evidencia, sv.especialidade, sv.observacoes
FROM atividade_1 a,
(VALUES 
  ('Isolar energia principal em painel de força', 5, 1, 'Disjuntor aberto e travado', 'foto', 'elétrica', 'Verificar etiqueta de bloqueio'),
  ('Validar EPI: óculos, luva, calçado', 3, 2, 'EPI disponível e em bom estado', 'checklist', 'segurança', 'Inspecionar integridade'),
  ('Liberar acesso supervisionado ao compressor', 2, 3, 'Área isolada com cones de segurança', 'foto', 'segurança', 'Afixar aviso de manutenção em progresso')
) AS sv(descricao, tempo, ordem, criterio, evidencia, especialidade, observacoes)
ON CONFLICT DO NOTHING;

-- Insert Activities 2-5 similar pattern...
-- Activity 2: Visual Inspection
WITH template_ids AS (
  SELECT id, empresa_id FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' AND nome = 'Preventiva Padrão - Compressor de Parafuso' LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT t.id, t.empresa_id, '2. Inspeção Visual e Funcional',
  'Inspeção detalhada de componentes críticos do bloco motor.', 2, 45, true FROM template_ids t ON CONFLICT DO NOTHING;

-- Activity 3: Technical Measurement
WITH template_ids AS (
  SELECT id, empresa_id FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' AND nome = 'Preventiva Padrão - Compressor de Parafuso' LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT t.id, t.empresa_id, '3. Medição Técnica (Preditiva)',
  'Coleta de dados de condição: vibração, temperatura, corrente.', 3, 40, false FROM template_ids t ON CONFLICT DO NOTHING;

-- Activity 4: Corrective Intervention
WITH template_ids AS (
  SELECT id, empresa_id FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' AND nome = 'Preventiva Padrão - Compressor de Parafuso' LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT t.id, t.empresa_id, '4. Intervenção Corretiva (se necessária)',
  'Reaperto, relubrificação, substituição preventiva de item crítico.', 4, 90, true FROM template_ids t ON CONFLICT DO NOTHING;

-- Activity 5: Testing & Closure
WITH template_ids AS (
  SELECT id, empresa_id FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' AND nome = 'Preventiva Padrão - Compressor de Parafuso' LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT t.id, t.empresa_id, '5. Teste e Fechamento Técnico',
  'Validação de funcionamento e registro de conclusão.', 5, 30, true FROM template_ids t ON CONFLICT DO NOTHING;
