-- =====================================================
-- PCM ESTRATÉGICO - MIGRAÇÃO COMPLETA DO BANCO DE DADOS
-- =====================================================

-- Tabela de Solicitações de Manutenção (Módulo 3)
CREATE TABLE IF NOT EXISTS public.solicitacoes_manutencao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_solicitacao SERIAL UNIQUE,
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50) NOT NULL,
    solicitante_nome VARCHAR(255) NOT NULL,
    solicitante_setor VARCHAR(100),
    descricao_falha TEXT NOT NULL,
    impacto VARCHAR(50) DEFAULT 'MEDIO' CHECK (impacto IN ('ALTO', 'MEDIO', 'BAIXO')),
    classificacao VARCHAR(50) DEFAULT 'PROGRAMAVEL' CHECK (classificacao IN ('EMERGENCIAL', 'URGENTE', 'PROGRAMAVEL')),
    status VARCHAR(50) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADA', 'CONVERTIDA', 'REJEITADA', 'CANCELADA')),
    os_id UUID REFERENCES public.ordens_servico(id),
    sla_horas INTEGER DEFAULT 24,
    data_limite TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    usuario_aprovacao UUID,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Planos Preventivos (Módulo 8)
CREATE TABLE IF NOT EXISTS public.planos_preventivos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50),
    tipo_gatilho VARCHAR(50) DEFAULT 'TEMPO' CHECK (tipo_gatilho IN ('TEMPO', 'CICLO', 'CONDICAO')),
    frequencia_dias INTEGER,
    frequencia_ciclos INTEGER,
    condicao_disparo TEXT,
    ultima_execucao TIMESTAMP WITH TIME ZONE,
    proxima_execucao TIMESTAMP WITH TIME ZONE,
    tempo_estimado_min INTEGER DEFAULT 60,
    especialidade VARCHAR(100),
    instrucoes TEXT,
    checklist JSONB,
    materiais_previstos JSONB,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Medições Preditivas (Módulo 9)
CREATE TABLE IF NOT EXISTS public.medicoes_preditivas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50) NOT NULL,
    tipo_medicao VARCHAR(100) NOT NULL,
    valor DECIMAL(15,4) NOT NULL,
    unidade VARCHAR(20) NOT NULL,
    limite_alerta DECIMAL(15,4),
    limite_critico DECIMAL(15,4),
    status VARCHAR(50) DEFAULT 'NORMAL' CHECK (status IN ('NORMAL', 'ALERTA', 'CRITICO')),
    observacoes TEXT,
    responsavel_nome VARCHAR(255),
    responsavel_id UUID,
    os_gerada_id UUID REFERENCES public.ordens_servico(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Inspeções/Rondas (Módulo 10)
CREATE TABLE IF NOT EXISTS public.inspecoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_inspecao SERIAL UNIQUE,
    rota_nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    turno VARCHAR(50),
    inspetor_nome VARCHAR(255) NOT NULL,
    inspetor_id UUID,
    data_inspecao DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_inicio TIME,
    hora_fim TIME,
    status VARCHAR(50) DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')),
    itens_inspecionados JSONB,
    anomalias_encontradas INTEGER DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Anomalias de Inspeção
CREATE TABLE IF NOT EXISTS public.anomalias_inspecao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    inspecao_id UUID REFERENCES public.inspecoes(id) ON DELETE CASCADE,
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50),
    descricao TEXT NOT NULL,
    severidade VARCHAR(50) DEFAULT 'MEDIA' CHECK (severidade IN ('CRITICA', 'ALTA', 'MEDIA', 'BAIXA')),
    foto_url TEXT,
    os_gerada_id UUID REFERENCES public.ordens_servico(id),
    status VARCHAR(50) DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de FMEA (Módulo 14)
CREATE TABLE IF NOT EXISTS public.fmea (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50) NOT NULL,
    funcao VARCHAR(255) NOT NULL,
    falha_funcional TEXT NOT NULL,
    modo_falha TEXT NOT NULL,
    efeito_falha TEXT,
    causa_falha TEXT,
    severidade INTEGER CHECK (severidade BETWEEN 1 AND 10),
    ocorrencia INTEGER CHECK (ocorrencia BETWEEN 1 AND 10),
    deteccao INTEGER CHECK (deteccao BETWEEN 1 AND 10),
    rpn INTEGER GENERATED ALWAYS AS (severidade * ocorrencia * deteccao) STORED,
    acao_recomendada TEXT,
    responsavel VARCHAR(255),
    prazo DATE,
    status VARCHAR(50) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO')),
    plano_preventivo_id UUID REFERENCES public.planos_preventivos(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Análise de Causa Raiz - RCA (Módulo 15)
CREATE TABLE IF NOT EXISTS public.analise_causa_raiz (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_rca SERIAL UNIQUE,
    os_id UUID REFERENCES public.ordens_servico(id),
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50),
    titulo VARCHAR(255) NOT NULL,
    descricao_problema TEXT NOT NULL,
    metodo_analise VARCHAR(50) DEFAULT '5_PORQUES' CHECK (metodo_analise IN ('5_PORQUES', 'ISHIKAWA', 'ARVORE_FALHAS', 'OUTRO')),
    porque_1 TEXT,
    porque_2 TEXT,
    porque_3 TEXT,
    porque_4 TEXT,
    porque_5 TEXT,
    causa_raiz_identificada TEXT,
    diagrama_ishikawa JSONB,
    arvore_falhas JSONB,
    status VARCHAR(50) DEFAULT 'EM_ANALISE' CHECK (status IN ('EM_ANALISE', 'CONCLUIDA', 'VERIFICANDO_EFICACIA', 'ENCERRADA')),
    responsavel_nome VARCHAR(255),
    responsavel_id UUID,
    data_conclusao DATE,
    eficacia_verificada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Ações Corretivas (vinculadas a RCA)
CREATE TABLE IF NOT EXISTS public.acoes_corretivas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rca_id UUID REFERENCES public.analise_causa_raiz(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    responsavel_nome VARCHAR(255) NOT NULL,
    responsavel_id UUID,
    prazo DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA', 'CANCELADA')),
    data_conclusao DATE,
    evidencias TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Melhorias / Kaizen (Módulo 16)
CREATE TABLE IF NOT EXISTS public.melhorias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_melhoria SERIAL UNIQUE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'KAIZEN' CHECK (tipo IN ('KAIZEN', 'PROJETO', 'LICAO_APRENDIDA', 'SUGESTAO')),
    area VARCHAR(100),
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50),
    situacao_antes TEXT,
    situacao_depois TEXT,
    beneficios TEXT,
    custo_implementacao DECIMAL(15,2),
    economia_anual DECIMAL(15,2),
    roi_meses INTEGER,
    status VARCHAR(50) DEFAULT 'PROPOSTA' CHECK (status IN ('PROPOSTA', 'EM_AVALIACAO', 'APROVADA', 'EM_IMPLEMENTACAO', 'IMPLEMENTADA', 'REJEITADA')),
    proponente_nome VARCHAR(255) NOT NULL,
    proponente_id UUID,
    aprovador_nome VARCHAR(255),
    aprovador_id UUID,
    data_aprovacao DATE,
    data_implementacao DATE,
    anexos JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Fornecedores/Prestadores (Módulo 17)
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18),
    tipo VARCHAR(50) DEFAULT 'PRESTADOR' CHECK (tipo IN ('PRESTADOR', 'FORNECEDOR', 'AMBOS')),
    especialidade VARCHAR(100),
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    contato_nome VARCHAR(255),
    contato_telefone VARCHAR(20),
    avaliacao_media DECIMAL(3,2) DEFAULT 0,
    total_avaliacoes INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Contratos (Módulo 17)
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_contrato VARCHAR(50) UNIQUE NOT NULL,
    fornecedor_id UUID REFERENCES public.fornecedores(id),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'SERVICO' CHECK (tipo IN ('SERVICO', 'FORNECIMENTO', 'MISTO')),
    valor_total DECIMAL(15,2),
    valor_mensal DECIMAL(15,2),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    sla_atendimento_horas INTEGER,
    sla_resolucao_horas INTEGER,
    penalidade_descricao TEXT,
    status VARCHAR(50) DEFAULT 'ATIVO' CHECK (status IN ('RASCUNHO', 'ATIVO', 'SUSPENSO', 'ENCERRADO', 'CANCELADO')),
    responsavel_nome VARCHAR(255),
    responsavel_id UUID,
    anexos JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Avaliações de Fornecedores
CREATE TABLE IF NOT EXISTS public.avaliacoes_fornecedores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    contrato_id UUID REFERENCES public.contratos(id),
    os_id UUID REFERENCES public.ordens_servico(id),
    nota_qualidade INTEGER CHECK (nota_qualidade BETWEEN 1 AND 5),
    nota_prazo INTEGER CHECK (nota_prazo BETWEEN 1 AND 5),
    nota_custo INTEGER CHECK (nota_custo BETWEEN 1 AND 5),
    nota_seguranca INTEGER CHECK (nota_seguranca BETWEEN 1 AND 5),
    nota_geral DECIMAL(3,2) GENERATED ALWAYS AS ((nota_qualidade + nota_prazo + nota_custo + nota_seguranca) / 4.0) STORED,
    comentarios TEXT,
    avaliador_nome VARCHAR(255) NOT NULL,
    avaliador_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Permissões de Trabalho - SSMA (Módulo 18)
CREATE TABLE IF NOT EXISTS public.permissoes_trabalho (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_pt SERIAL UNIQUE,
    os_id UUID REFERENCES public.ordens_servico(id),
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50),
    tipo VARCHAR(50) DEFAULT 'GERAL' CHECK (tipo IN ('GERAL', 'TRABALHO_ALTURA', 'ESPACO_CONFINADO', 'TRABALHO_QUENTE', 'ELETRICA', 'ESCAVACAO')),
    descricao_servico TEXT NOT NULL,
    riscos_identificados TEXT,
    medidas_controle TEXT,
    epis_requeridos TEXT,
    isolamentos TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    executante_nome VARCHAR(255) NOT NULL,
    supervisor_nome VARCHAR(255) NOT NULL,
    aprovador_nome VARCHAR(255),
    aprovador_id UUID,
    status VARCHAR(50) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA')),
    checklist_seguranca JSONB,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Incidentes SSMA
CREATE TABLE IF NOT EXISTS public.incidentes_ssma (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_incidente SERIAL UNIQUE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ACIDENTE', 'QUASE_ACIDENTE', 'INCIDENTE_AMBIENTAL', 'DESVIO')),
    severidade VARCHAR(50) DEFAULT 'LEVE' CHECK (severidade IN ('LEVE', 'MODERADO', 'GRAVE', 'FATAL')),
    data_ocorrencia TIMESTAMP WITH TIME ZONE NOT NULL,
    local_ocorrencia VARCHAR(255),
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50),
    descricao TEXT NOT NULL,
    pessoas_envolvidas TEXT,
    testemunhas TEXT,
    causas_imediatas TEXT,
    causas_basicas TEXT,
    acoes_imediatas TEXT,
    rca_id UUID REFERENCES public.analise_causa_raiz(id),
    dias_afastamento INTEGER DEFAULT 0,
    custo_estimado DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_INVESTIGACAO', 'AGUARDANDO_ACOES', 'ENCERRADO')),
    responsavel_nome VARCHAR(255),
    responsavel_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Documentos Técnicos (Módulo 2)
CREATE TABLE IF NOT EXISTS public.documentos_tecnicos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'MANUAL' CHECK (tipo IN ('MANUAL', 'DESENHO', 'DIAGRAMA', 'PROCEDIMENTO', 'INSTRUCAO', 'DATASHEET', 'CERTIFICADO', 'OUTRO')),
    descricao TEXT,
    versao VARCHAR(20) DEFAULT '1.0',
    equipamento_id UUID REFERENCES public.equipamentos(id),
    tag VARCHAR(50),
    arquivo_url TEXT,
    arquivo_nome VARCHAR(255),
    arquivo_tamanho INTEGER,
    status VARCHAR(50) DEFAULT 'VIGENTE' CHECK (status IN ('RASCUNHO', 'EM_REVISAO', 'VIGENTE', 'OBSOLETO')),
    aprovador_nome VARCHAR(255),
    aprovador_id UUID,
    data_aprovacao DATE,
    data_validade DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Configurações do Sistema (Módulo 0)
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descricao VARCHAR(255),
    tipo VARCHAR(50) DEFAULT 'STRING' CHECK (tipo IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
    categoria VARCHAR(100) DEFAULT 'GERAL',
    editavel BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.solicitacoes_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicoes_preditivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalias_inspecao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_causa_raiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoes_corretivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.melhorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes_ssma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - ACESSO PARA USUÁRIOS AUTENTICADOS
-- =====================================================

-- Solicitações de Manutenção
CREATE POLICY "Usuarios autenticados podem ver solicitacoes" ON public.solicitacoes_manutencao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar solicitacoes" ON public.solicitacoes_manutencao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar solicitacoes" ON public.solicitacoes_manutencao FOR UPDATE TO authenticated USING (true);

-- Planos Preventivos
CREATE POLICY "Usuarios autenticados podem ver planos" ON public.planos_preventivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar planos" ON public.planos_preventivos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar planos" ON public.planos_preventivos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar planos" ON public.planos_preventivos FOR DELETE TO authenticated USING (true);

-- Medições Preditivas
CREATE POLICY "Usuarios autenticados podem ver medicoes" ON public.medicoes_preditivas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar medicoes" ON public.medicoes_preditivas FOR INSERT TO authenticated WITH CHECK (true);

-- Inspeções
CREATE POLICY "Usuarios autenticados podem ver inspecoes" ON public.inspecoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar inspecoes" ON public.inspecoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar inspecoes" ON public.inspecoes FOR UPDATE TO authenticated USING (true);

-- Anomalias de Inspeção
CREATE POLICY "Usuarios autenticados podem ver anomalias" ON public.anomalias_inspecao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar anomalias" ON public.anomalias_inspecao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar anomalias" ON public.anomalias_inspecao FOR UPDATE TO authenticated USING (true);

-- FMEA
CREATE POLICY "Usuarios autenticados podem ver fmea" ON public.fmea FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar fmea" ON public.fmea FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar fmea" ON public.fmea FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar fmea" ON public.fmea FOR DELETE TO authenticated USING (true);

-- Análise de Causa Raiz
CREATE POLICY "Usuarios autenticados podem ver rca" ON public.analise_causa_raiz FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar rca" ON public.analise_causa_raiz FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar rca" ON public.analise_causa_raiz FOR UPDATE TO authenticated USING (true);

-- Ações Corretivas
CREATE POLICY "Usuarios autenticados podem ver acoes" ON public.acoes_corretivas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar acoes" ON public.acoes_corretivas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar acoes" ON public.acoes_corretivas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar acoes" ON public.acoes_corretivas FOR DELETE TO authenticated USING (true);

-- Melhorias
CREATE POLICY "Usuarios autenticados podem ver melhorias" ON public.melhorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar melhorias" ON public.melhorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar melhorias" ON public.melhorias FOR UPDATE TO authenticated USING (true);

-- Fornecedores
CREATE POLICY "Usuarios autenticados podem ver fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar fornecedores" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar fornecedores" ON public.fornecedores FOR UPDATE TO authenticated USING (true);

-- Contratos
CREATE POLICY "Usuarios autenticados podem ver contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar contratos" ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar contratos" ON public.contratos FOR UPDATE TO authenticated USING (true);

-- Avaliações de Fornecedores
CREATE POLICY "Usuarios autenticados podem ver avaliacoes" ON public.avaliacoes_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar avaliacoes" ON public.avaliacoes_fornecedores FOR INSERT TO authenticated WITH CHECK (true);

-- Permissões de Trabalho
CREATE POLICY "Usuarios autenticados podem ver pt" ON public.permissoes_trabalho FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar pt" ON public.permissoes_trabalho FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar pt" ON public.permissoes_trabalho FOR UPDATE TO authenticated USING (true);

-- Incidentes SSMA
CREATE POLICY "Usuarios autenticados podem ver incidentes" ON public.incidentes_ssma FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar incidentes" ON public.incidentes_ssma FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar incidentes" ON public.incidentes_ssma FOR UPDATE TO authenticated USING (true);

-- Documentos Técnicos
CREATE POLICY "Usuarios autenticados podem ver documentos" ON public.documentos_tecnicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem criar documentos" ON public.documentos_tecnicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar documentos" ON public.documentos_tecnicos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar documentos" ON public.documentos_tecnicos FOR DELETE TO authenticated USING (true);

-- Configurações do Sistema
CREATE POLICY "Usuarios autenticados podem ver configuracoes" ON public.configuracoes_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem atualizar configuracoes" ON public.configuracoes_sistema FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON public.solicitacoes_manutencao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planos_updated_at BEFORE UPDATE ON public.planos_preventivos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspecoes_updated_at BEFORE UPDATE ON public.inspecoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fmea_updated_at BEFORE UPDATE ON public.fmea FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rca_updated_at BEFORE UPDATE ON public.analise_causa_raiz FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_acoes_updated_at BEFORE UPDATE ON public.acoes_corretivas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_melhorias_updated_at BEFORE UPDATE ON public.melhorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pt_updated_at BEFORE UPDATE ON public.permissoes_trabalho FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incidentes_updated_at BEFORE UPDATE ON public.incidentes_ssma FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos_tecnicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON public.configuracoes_sistema FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS DE CONFIGURAÇÃO
-- =====================================================

INSERT INTO public.configuracoes_sistema (chave, valor, descricao, tipo, categoria) VALUES
('SLA_EMERGENCIAL_HORAS', '2', 'SLA para solicitações emergenciais (horas)', 'NUMBER', 'SLA'),
('SLA_URGENTE_HORAS', '8', 'SLA para solicitações urgentes (horas)', 'NUMBER', 'SLA'),
('SLA_PROGRAMAVEL_HORAS', '72', 'SLA para solicitações programáveis (horas)', 'NUMBER', 'SLA'),
('TURNO_MANHA_INICIO', '06:00', 'Início do turno da manhã', 'STRING', 'TURNOS'),
('TURNO_MANHA_FIM', '14:00', 'Fim do turno da manhã', 'STRING', 'TURNOS'),
('TURNO_TARDE_INICIO', '14:00', 'Início do turno da tarde', 'STRING', 'TURNOS'),
('TURNO_TARDE_FIM', '22:00', 'Fim do turno da tarde', 'STRING', 'TURNOS'),
('TURNO_NOITE_INICIO', '22:00', 'Início do turno da noite', 'STRING', 'TURNOS'),
('TURNO_NOITE_FIM', '06:00', 'Fim do turno da noite', 'STRING', 'TURNOS'),
('EMPRESA_NOME', 'Empresa Industrial S.A.', 'Nome da empresa', 'STRING', 'GERAL'),
('ALERTA_BACKLOG_SEMANAS', '4', 'Alerta quando backlog exceder X semanas', 'NUMBER', 'ALERTAS'),
('META_DISPONIBILIDADE', '95', 'Meta de disponibilidade em %', 'NUMBER', 'METAS'),
('META_MTBF_HORAS', '720', 'Meta de MTBF em horas', 'NUMBER', 'METAS'),
('META_MTTR_HORAS', '4', 'Meta de MTTR em horas', 'NUMBER', 'METAS')
ON CONFLICT (chave) DO NOTHING;