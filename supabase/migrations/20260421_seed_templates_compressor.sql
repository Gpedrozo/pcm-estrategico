-- Seed: Templates de atividades para Compressor de Parafuso
-- Este script popula templates padrão para geração automática de planos preventivos

INSERT INTO template_atividades_preventivas (empresa_id, nome, tipo_componente, descricao, ativo, ordem)
SELECT 
  empresas.id,
  'Preventiva Padrão - Compressor de Parafuso',
  'compressor',
  'Template de atividades para manutenção preventiva de compressor de parafuso com foco em componente recorrente e sinais preditivos.',
  true,
  1
FROM empresas
WHERE tag = 'GPPIS' -- ou ajuste conforme sua empresa
LIMIT 1
ON CONFLICT DO NOTHING;

-- Buscar o ID do template criado
WITH template_ids AS (
  SELECT id, empresa_id
  FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' 
    AND nome = 'Preventiva Padrão - Compressor de Parafuso'
  LIMIT 1
)

-- Atividade 1: Preparação e Segurança
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

-- Serviços da Atividade 1
WITH atividade_1 AS (
  SELECT a.id, a.empresa_id, t.id as template_id
  FROM template_atividades_preventivas_atividades a
  JOIN template_atividades_preventivas t ON a.template_id = t.id
  WHERE t.tipo_componente = 'compressor'
    AND a.nome = '1. Preparação e Segurança'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_servicos
(atividade_template_id, empresa_id, descricao, tempo_estimado_min, ordem, criterio_aceite, evidencia_obrigatoria, especialidade, observacoes)
SELECT 
  atividade_1.id,
  atividade_1.empresa_id,
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  col7
FROM atividade_1,
(VALUES 
  ('Isolar energia principal em painel de força', 5, 1, 'Disjuntor aberto e travado', 'foto', 'elétrica', 'Verificar etiqueta de bloqueio'),
  ('Validar EPI: óculos, luva, calçado', 3, 2, 'EPI disponível e em bom estado', 'checklist', 'segurança', 'Inspecionar integridade'),
  ('Liberar acesso supervisionado ao compressor', 2, 3, 'Área isolada com cones de segurança', 'foto', 'segurança', 'Afixar aviso de manutenção em progresso')
) AS t(col1, col2, col3, col4, col5, col6, col7)
ON CONFLICT DO NOTHING;

-- Atividade 2: Inspeção Visual e Funcional
WITH template_ids AS (
  SELECT id, empresa_id
  FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' 
    AND nome = 'Preventiva Padrão - Compressor de Parafuso'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT 
  t.id,
  t.empresa_id,
  '2. Inspeção Visual e Funcional',
  'Inspeção detalhada de componentes críticos do bloco motor.',
  2,
  45,
  true
FROM template_ids t
ON CONFLICT DO NOTHING;

-- Serviços da Atividade 2
WITH atividade_2 AS (
  SELECT a.id, a.empresa_id, t.id as template_id
  FROM template_atividades_preventivas_atividades a
  JOIN template_atividades_preventivas t ON a.template_id = t.id
  WHERE t.tipo_componente = 'compressor'
    AND a.nome = '2. Inspeção Visual e Funcional'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_servicos
(atividade_template_id, empresa_id, descricao, tempo_estimado_min, ordem, criterio_aceite, evidencia_obrigatoria, especialidade, observacoes)
SELECT 
  atividade_2.id,
  atividade_2.empresa_id,
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  col7
FROM atividade_2,
(VALUES 
  ('Inspeção visual do bloco motor compressor', 15, 1, 'Sem vazamentos óleo, fissuras ou soltura de parafusos', 'foto', 'mecanica', 'Fotografar 3 ângulos diferentes'),
  ('Verificar reaperto de parafusos bloco motor', 10, 2, 'Torque dentro de especificação', 'checklist', 'mecanica', 'Usar chave dinamométrica'),
  ('Teste manual de folga no eixo acoplamento', 8, 3, 'Folga axial < 0.5 mm e radial < 1 mm', 'medição', 'mecanica', 'Usar centesimal e relógio comparador'),
  ('Inspecionar condição de filtro saída ar', 12, 4, 'Elemento sem entupimento, sem rasgos', 'foto', 'mecanica', 'Registrar condição visual')
) AS t(col1, col2, col3, col4, col5, col6, col7)
ON CONFLICT DO NOTHING;

-- Atividade 3: Medição Técnica (Preditiva)
WITH template_ids AS (
  SELECT id, empresa_id
  FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' 
    AND nome = 'Preventiva Padrão - Compressor de Parafuso'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT 
  t.id,
  t.empresa_id,
  '3. Medição Técnica (Preditiva)',
  'Coleta de dados de condição: vibração, temperatura, corrente.',
  3,
  40,
  false
FROM template_ids t
ON CONFLICT DO NOTHING;

-- Serviços da Atividade 3
WITH atividade_3 AS (
  SELECT a.id, a.empresa_id, t.id as template_id
  FROM template_atividades_preventivas_atividades a
  JOIN template_atividades_preventivas t ON a.template_id = t.id
  WHERE t.tipo_componente = 'compressor'
    AND a.nome = '3. Medição Técnica (Preditiva)'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_servicos
(atividade_template_id, empresa_id, descricao, tempo_estimado_min, ordem, criterio_aceite, evidencia_obrigatoria, especialidade, observacoes)
SELECT 
  atividade_3.id,
  atividade_3.empresa_id,
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  col7
FROM atividade_3,
(VALUES 
  ('Medir vibração em 3 eixos (X, Y, Z) - ponto motor', 12, 1, 'Vibração < 7.1 mm/s (Zona A ISO 10816), tendência estável', 'medição', 'mecanica', 'Usar acelerômetro ou vibrômetro, registrar em tabela'),
  ('Medir vibração em 3 eixos - acoplamento', 10, 2, 'Vibração < 7.1 mm/s, sem ressonância', 'medição', 'mecanica', 'Comparar com baseline histórico'),
  ('Medir temperatura bulbo seco carcaça motor', 8, 3, 'Temperatura < 80°C em regime permanente', 'medição', 'mecanica', 'Usar termômetro infravermelho calibrado'),
  ('Registrar corrente elétrica motor', 10, 4, 'Corrente dentro de ±10% da corrente nominal', 'medição', 'elétrica', 'Usar alicate amperímetro')
) AS t(col1, col2, col3, col4, col5, col6, col7)
ON CONFLICT DO NOTHING;

-- Atividade 4: Intervenção Corretiva (se necessária)
WITH template_ids AS (
  SELECT id, empresa_id
  FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' 
    AND nome = 'Preventiva Padrão - Compressor de Parafuso'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT 
  t.id,
  t.empresa_id,
  '4. Intervenção Corretiva (se necessária)',
  'Reaperto, relubrificação, substituição preventiva de item crítico.',
  4,
  90,
  true
FROM template_ids t
ON CONFLICT DO NOTHING;

-- Serviços da Atividade 4
WITH atividade_4 AS (
  SELECT a.id, a.empresa_id, t.id as template_id
  FROM template_atividades_preventivas_atividades a
  JOIN template_atividades_preventivas t ON a.template_id = t.id
  WHERE t.tipo_componente = 'compressor'
    AND a.nome = '4. Intervenção Corretiva (se necessária)'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_servicos
(atividade_template_id, empresa_id, descricao, tempo_estimado_min, ordem, criterio_aceite, evidencia_obrigatoria, especialidade, observacoes)
SELECT 
  atividade_4.id,
  atividade_4.empresa_id,
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  col7
FROM atividade_4,
(VALUES 
  ('Relubrificar mancal motor (se aplicável)', 15, 1, 'Graxa relubrificante aplicada conforme especificação', 'checklist', 'mecanica', 'Não exceder quantidade (risco de derramamento)'),
  ('Substituir filtro saída ar se necessário', 20, 2, 'Filtro removido e substituído por novo OEM', 'foto', 'mecanica', 'Descartar conforme política ambiental'),
  ('Substituição preventiva de correia transmissão (if sinalizado)', 40, 3, 'Correia nova instalada e pré-tensionada', 'foto', 'mecanica', 'Somente se indicado por vibração ou histórico'),
  ('Reaperto definitivo todos os parafusos críticos', 15, 4, 'Torque validado com chave dinamométrica conforme manual', 'checklist', 'mecanica', 'Registrar valores de torque em planilha')
) AS t(col1, col2, col3, col4, col5, col6, col7)
ON CONFLICT DO NOTHING;

-- Atividade 5: Teste e Fechamento
WITH template_ids AS (
  SELECT id, empresa_id
  FROM template_atividades_preventivas
  WHERE tipo_componente = 'compressor' 
    AND nome = 'Preventiva Padrão - Compressor de Parafuso'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_atividades 
(template_id, empresa_id, nome, descricao, ordem, tempo_estimado_min, requer_parada)
SELECT 
  t.id,
  t.empresa_id,
  '5. Teste e Fechamento Técnico',
  'Validação de funcionamento e registro de conclusão.',
  5,
  30,
  true
FROM template_ids t
ON CONFLICT DO NOTHING;

-- Serviços da Atividade 5
WITH atividade_5 AS (
  SELECT a.id, a.empresa_id, t.id as template_id
  FROM template_atividades_preventivas_atividades a
  JOIN template_atividades_preventivas t ON a.template_id = t.id
  WHERE t.tipo_componente = 'compressor'
    AND a.nome = '5. Teste e Fechamento Técnico'
  LIMIT 1
)
INSERT INTO template_atividades_preventivas_servicos
(atividade_template_id, empresa_id, descricao, tempo_estimado_min, ordem, criterio_aceite, evidencia_obrigatoria, especialidade, observacoes)
SELECT 
  atividade_5.id,
  atividade_5.empresa_id,
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  col7
FROM atividade_5,
(VALUES 
  ('Energizar motor e validar funcionamento normal', 10, 1, 'Motor liga sem anomalia, sem ruído anormal', 'observação', 'elétrica', 'Observação por 2-3 minutos em carga parcial'),
  ('Obter foto panorâmica do compressor após manutenção', 5, 2, 'Foto registrada com data/hora e assinatura', 'foto', 'mecanica', 'Arquivo anexado ao plano'),
  ('Registrar todas as evidências e observações na aplicação', 10, 3, 'Todas as medições, fotos e checklist gravados', 'múltiplas', 'geral', 'Validar dados antes de fechar'),
  ('Liberar ativo para operação produtiva', 5, 4, 'Checklist verde = ativo liberado', 'checklist', 'geral', 'Comunicar ao operador de produção')
) AS t(col1, col2, col3, col4, col5, col6, col7)
ON CONFLICT DO NOTHING;
