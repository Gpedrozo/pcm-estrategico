-- Create table for equipment components with hierarchical structure
CREATE TABLE public.componentes_equipamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.componentes_equipamento(id) ON DELETE CASCADE,
  
  -- Identification
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- MOTOR, ACOPLAMENTO, EIXO, ROLAMENTO, MANCAL, CHAVETA, TRANSMISSAO, DISJUNTOR, FIO, REDUTOR, INVERSOR, BOMBA, VALVULA, SENSOR, OUTRO
  
  -- Specifications
  fabricante TEXT,
  modelo TEXT,
  numero_serie TEXT,
  potencia TEXT,
  rpm TEXT,
  tensao TEXT,
  corrente TEXT,
  
  -- Dimensions
  dimensoes JSONB, -- {diametro, comprimento, largura, altura, peso}
  
  -- Additional specs (flexible)
  especificacoes JSONB, -- For any additional specifications
  
  -- Status
  quantidade INTEGER DEFAULT 1,
  posicao TEXT, -- Position in equipment (e.g., "Lado Motor", "Eixo Principal")
  data_instalacao DATE,
  vida_util_horas INTEGER,
  horas_operacao INTEGER DEFAULT 0,
  
  -- Maintenance info
  ultima_manutencao DATE,
  proxima_manutencao DATE,
  intervalo_manutencao_dias INTEGER,
  
  -- Status
  estado TEXT DEFAULT 'BOM', -- BOM, REGULAR, RUIM, SUBSTITUIR
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.componentes_equipamento ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios autenticados podem ver componentes"
  ON public.componentes_equipamento FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados podem criar componentes"
  ON public.componentes_equipamento FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar componentes"
  ON public.componentes_equipamento FOR UPDATE
  USING (true);

CREATE POLICY "Admins podem deletar componentes"
  ON public.componentes_equipamento FOR DELETE
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Create indexes for performance
CREATE INDEX idx_componentes_equipamento_id ON public.componentes_equipamento(equipamento_id);
CREATE INDEX idx_componentes_parent_id ON public.componentes_equipamento(parent_id);
CREATE INDEX idx_componentes_tipo ON public.componentes_equipamento(tipo);

-- Trigger for updated_at
CREATE TRIGGER update_componentes_equipamento_updated_at
  BEFORE UPDATE ON public.componentes_equipamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();