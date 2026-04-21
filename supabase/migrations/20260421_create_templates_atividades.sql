-- Templates de atividades preventivas por tipo de componente
CREATE TABLE IF NOT EXISTS template_atividades_preventivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_componente TEXT NOT NULL, -- 'compressor', 'motor', 'bomba', 'redutor', 'rolamento', 'generico'
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(empresa_id, tipo_componente, nome)
);

-- Atividades dentro do template
CREATE TABLE IF NOT EXISTS template_atividades_preventivas_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES template_atividades_preventivas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 1,
  tempo_estimado_min INT DEFAULT 60,
  requer_parada BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Serviços dentro de cada atividade do template
CREATE TABLE IF NOT EXISTS template_atividades_preventivas_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atividade_template_id UUID NOT NULL REFERENCES template_atividades_preventivas_atividades(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  tempo_estimado_min INT DEFAULT 15,
  ordem INT NOT NULL DEFAULT 1,
  criterio_aceite TEXT, -- ex: "Vibração < 7.1 mm/s", "Temp < 80°C"
  evidencia_obrigatoria TEXT, -- 'foto', 'medição', 'checklist', 'observação', 'múltiplas'
  especialidade TEXT, -- ex: 'mecanica', 'elétrica', 'automação'
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE template_atividades_preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_atividades_preventivas_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_atividades_preventivas_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_templates" ON template_atividades_preventivas;
CREATE POLICY "tenant_isolation_templates" ON template_atividades_preventivas
  FOR ALL USING (empresa_id = auth.uid() OR (SELECT empresa_id FROM profiles WHERE id = auth.uid()) = empresa_id);

DROP POLICY IF EXISTS "tenant_isolation_templates_atividades" ON template_atividades_preventivas_atividades;
CREATE POLICY "tenant_isolation_templates_atividades" ON template_atividades_preventivas_atividades
  FOR ALL USING (empresa_id = auth.uid() OR (SELECT empresa_id FROM profiles WHERE id = auth.uid()) = empresa_id);

DROP POLICY IF EXISTS "tenant_isolation_templates_servicos" ON template_atividades_preventivas_servicos;
CREATE POLICY "tenant_isolation_templates_servicos" ON template_atividades_preventivas_servicos
  FOR ALL USING (empresa_id = auth.uid() OR (SELECT empresa_id FROM profiles WHERE id = auth.uid()) = empresa_id);

-- Índices
CREATE INDEX idx_templates_empresa_tipo ON template_atividades_preventivas(empresa_id, tipo_componente, ativo);
CREATE INDEX idx_templates_atividades_template ON template_atividades_preventivas_atividades(template_id, empresa_id);
CREATE INDEX idx_templates_servicos_atividade ON template_atividades_preventivas_servicos(atividade_template_id, empresa_id);
