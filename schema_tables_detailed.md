# Database Tables (from types.ts)

## acoes_corretivas
- created_at: string
- data_conclusao: string | null
- descricao: string
- evidencias: string | null
- id: string
- observacoes: string | null
- prazo: string
- rca_id: string | null
- responsavel_id: string | null
- responsavel_nome: string
- status: string | null
- updated_at: string

## ai_root_cause_analysis
- confidence_score: number | null
- created_at: string
- criticality: string | null
- equipamento_id: string | null
- generated_at: string
- id: string
- main_hypothesis: string | null
- possible_causes: Json | null
- preventive_actions: Json | null
- raw_response: Json | null
- summary: string | null
- tag: string

## analise_causa_raiz
- arvore_falhas: Json | null
- causa_raiz_identificada: string | null
- created_at: string
- data_conclusao: string | null
- descricao_problema: string
- diagrama_ishikawa: Json | null
- eficacia_verificada: boolean | null
- equipamento_id: string | null
- id: string
- metodo_analise: string | null
- numero_rca: number
- os_id: string | null
- porque_1: string | null
- porque_2: string | null
- porque_3: string | null
- porque_4: string | null
- porque_5: string | null
- responsavel_id: string | null
- responsavel_nome: string | null
- status: string | null
- tag: string | null
- titulo: string
- updated_at: string

## anomalias_inspecao
- created_at: string
- descricao: string
- equipamento_id: string | null
- foto_url: string | null
- id: string
- inspecao_id: string | null
- os_gerada_id: string | null
- severidade: string | null
- status: string | null
- tag: string | null

## areas
- ativo: boolean
- codigo: string
- created_at: string
- descricao: string | null
- id: string
- nome: string
- planta_id: string
- updated_at: string

## atividades_preventivas
- created_at: string
- id: string
- nome: string
- observacoes: string | null
- ordem: number
- plano_id: string
- responsavel: string | null
- tempo_total_min: number
- updated_at: string

## auditoria
- acao: string
- data_hora: string
- descricao: string
- id: string
- tag: string | null
- usuario_id: string | null
- usuario_nome: string

## auditoria_logs
- created_at: string | null
- dados_antes: Json | null
- dados_depois: Json | null
- id: string
- operacao: string
- registro_id: string
- tabela: string
- usuario_id: string | null

## avaliacoes_fornecedores
- avaliador_id: string | null
- avaliador_nome: string
- comentarios: string | null
- contrato_id: string | null
- created_at: string
- fornecedor_id: string | null
- id: string
- nota_custo: number | null
- nota_geral: number | null
- nota_prazo: number | null
- nota_qualidade: number | null
- nota_seguranca: number | null
- os_id: string | null

## componentes_equipamento
- ativo: boolean | null
- codigo: string
- corrente: string | null
- created_at: string
- data_instalacao: string | null
- dimensoes: Json | null
- equipamento_id: string
- especificacoes: Json | null
- estado: string | null
- fabricante: string | null
- horas_operacao: number | null
- id: string
- intervalo_manutencao_dias: number | null
- modelo: string | null
- nome: string
- numero_serie: string | null
- observacoes: string | null
- parent_id: string | null
- posicao: string | null
- potencia: string | null
- proxima_manutencao: string | null
- quantidade: number | null
- rpm: string | null
- tensao: string | null
- tipo: string
- ultima_manutencao: string | null
- updated_at: string
- vida_util_horas: number | null

## configuracoes_sistema
- categoria: string | null
- chave: string
- created_at: string
- descricao: string | null
- editavel: boolean | null
- id: string
- tipo: string | null
- updated_at: string
- valor: string | null

## contrato_alertas
- contrato_id: string
- created_at: string | null
- id: string
- mensagem: string
- tipo: string
- visualizado: boolean | null

## contratos
- anexos: Json | null
- created_at: string
- data_fim: string | null
- data_inicio: string
- descricao: string | null
- fornecedor_id: string | null
- id: string
- numero_contrato: string
- penalidade_descricao: string | null
- responsavel_id: string | null
- responsavel_nome: string | null
- sla_atendimento_horas: number | null
- sla_resolucao_horas: number | null
- status: string | null
- tipo: string | null
- titulo: string
- updated_at: string
- valor_mensal: number | null
- valor_total: number | null

## dados_empresa
- cep: string | null
- cidade: string | null
- cnpj: string | null
- created_at: string
- email: string | null
- endereco: string | null
- estado: string | null
- id: string
- inscricao_estadual: string | null
- logo_login_url: string | null
- logo_menu_url: string | null
- logo_os_url: string | null
- logo_pdf_url: string | null
- logo_principal_url: string | null
- logo_relatorio_url: string | null
- nome_fantasia: string | null
- razao_social: string
- responsavel_cargo: string | null
- responsavel_nome: string | null
- site: string | null
- telefone: string | null
- updated_at: string
- whatsapp: string | null

## document_layouts
- ativo: boolean
- autor_nome: string | null
- configuracao: Json
- created_at: string
- id: string
- nome: string
- tipo_documento: string
- updated_at: string
- versao: string

## document_sequences
- created_at: string
- id: string
- prefixo: string
- tipo_documento: string
- ultimo_numero: number
- updated_at: string

## documentos_tecnicos
- aprovador_id: string | null
- aprovador_nome: string | null
- arquivo_nome: string | null
- arquivo_tamanho: number | null
- arquivo_url: string | null
- codigo: string
- created_at: string
- data_aprovacao: string | null
- data_validade: string | null
- descricao: string | null
- equipamento_id: string | null
- id: string
- status: string | null
- tag: string | null
- tipo: string | null
- titulo: string
- updated_at: string
- versao: string | null

## equipamentos
- ativo: boolean
- created_at: string
- criticidade: string
- data_instalacao: string | null
- fabricante: string | null
- id: string
- localizacao: string | null
- modelo: string | null
- nivel_risco: string
- nome: string
- numero_serie: string | null
- sistema_id: string | null
- tag: string
- updated_at: string

## execucoes_os
- created_at: string
- custo_mao_obra: number | null
- custo_materiais: number | null
- custo_terceiros: number | null
- custo_total: number | null
- data_execucao: string
- hora_fim: string
- hora_inicio: string
- id: string
- mecanico_id: string | null
- mecanico_nome: string
- os_id: string
- servico_executado: string
- tempo_execucao: number

## execucoes_preventivas
- checklist: Json | null
- created_at: string
- data_execucao: string
- executor_id: string | null
- executor_nome: string
- id: string
- observacoes: string | null
- os_gerada_id: string | null
- plano_id: string
- status: string
- tempo_real_min: number | null
- updated_at: string

## fmea
- acao_recomendada: string | null
- causa_falha: string | null
- created_at: string
- deteccao: number | null
- efeito_falha: string | null
- equipamento_id: string | null
- falha_funcional: string
- funcao: string
- id: string
- modo_falha: string
- ocorrencia: number | null
- plano_preventivo_id: string | null
- prazo: string | null
- responsavel: string | null
- rpn: number | null
- severidade: number | null
- status: string | null
- tag: string
- updated_at: string

## fornecedores
- ativo: boolean | null
- avaliacao_media: number | null
- cnpj: string | null
- codigo: string
- contato_nome: string | null
- contato_telefone: string | null
- created_at: string
- email: string | null
- endereco: string | null
- especialidade: string | null
- id: string
- nome_fantasia: string | null
- observacoes: string | null
- razao_social: string
- telefone: string | null
- tipo: string | null
- total_avaliacoes: number | null
- updated_at: string

## incidentes_ssma
- acoes_imediatas: string | null
- causas_basicas: string | null
- causas_imediatas: string | null
- created_at: string
- custo_estimado: number | null
- data_ocorrencia: string
- descricao: string
- dias_afastamento: number | null
- equipamento_id: string | null
- id: string
- local_ocorrencia: string | null
- numero_incidente: number
- pessoas_envolvidas: string | null
- rca_id: string | null
- responsavel_id: string | null
- responsavel_nome: string | null
- severidade: string | null
- status: string | null
- tag: string | null
- testemunhas: string | null
- tipo: string
- updated_at: string

## inspecoes
- anomalias_encontradas: number | null
- created_at: string
- data_inspecao: string
- descricao: string | null
- hora_fim: string | null
- hora_inicio: string | null
- id: string
- inspetor_id: string | null
- inspetor_nome: string
- itens_inspecionados: Json | null
- numero_inspecao: number
- observacoes: string | null
- rota_nome: string
- status: string | null
- turno: string | null
- updated_at: string

## materiais
- ativo: boolean
- codigo: string
- created_at: string
- custo_unitario: number
- estoque_atual: number
- estoque_minimo: number
- id: string
- localizacao: string | null
- nome: string
- unidade: string
- updated_at: string

## materiais_os
- created_at: string
- custo_total: number
- custo_unitario: number
- id: string
- material_id: string
- os_id: string
- quantidade: number

## mecanicos
- ativo: boolean
- created_at: string
- custo_hora: number | null
- especialidade: string | null
- id: string
- nome: string
- telefone: string | null
- tipo: string
- updated_at: string

## medicoes_preditivas
- created_at: string
- equipamento_id: string | null
- id: string
- limite_alerta: number | null
- limite_critico: number | null
- observacoes: string | null
- os_gerada_id: string | null
- responsavel_id: string | null
- responsavel_nome: string | null
- status: string | null
- tag: string
- tipo_medicao: string
- unidade: string
- valor: number

## melhorias
- anexos: Json | null
- aprovador_id: string | null
- aprovador_nome: string | null
- area: string | null
- beneficios: string | null
- created_at: string
- custo_implementacao: number | null
- data_aprovacao: string | null
- data_implementacao: string | null
- descricao: string
- economia_anual: number | null
- equipamento_id: string | null
- id: string
- numero_melhoria: number
- proponente_id: string | null
- proponente_nome: string
- roi_meses: number | null
- situacao_antes: string | null
- situacao_depois: string | null
- status: string | null
- tag: string | null
- tipo: string | null
- titulo: string
- updated_at: string

## movimentacoes_materiais
- created_at: string
- custo_total: number | null
- custo_unitario: number | null
- id: string
- material_id: string
- observacao: string | null
- os_id: string | null
- quantidade: number
- tipo: string
- usuario_id: string | null
- usuario_nome: string

## notificacoes
- created_at: string | null
- id: string
- lida: boolean | null
- mensagem: string
- metadata: Json | null
- tipo: string
- user_id: string | null

## ordens_servico
- acao_corretiva: string | null
- causa_raiz: string | null
- created_at: string
- custo_estimado: number | null
- data_fechamento: string | null
- data_solicitacao: string
- equipamento: string
- id: string
- licoes_aprendidas: string | null
- modo_falha: string | null
- numero_os: number
- prioridade: string
- problema: string
- solicitante: string
- status: string
- tag: string
- tempo_estimado: number | null
- tipo: string
- updated_at: string
- usuario_abertura: string | null
- usuario_fechamento: string | null

## permissoes_granulares
- acessar_historico: boolean | null
- acessar_indicadores: boolean | null
- alterar_status: boolean | null
- created_at: string
- criar: boolean | null
- editar: boolean | null
- excluir: boolean | null
- exportar: boolean | null
- id: string
- importar: boolean | null
- imprimir: boolean | null
- modulo: string
- updated_at: string
- user_id: string
- ver_criticidade: boolean | null
- ver_custos: boolean | null
- ver_dados_financeiros: boolean | null
- ver_obs_internas: boolean | null
- ver_status: boolean | null
- ver_valores: boolean | null
- visualizar: boolean | null

## permissoes_trabalho
- aprovador_id: string | null
- aprovador_nome: string | null
- checklist_seguranca: Json | null
- created_at: string
- data_fim: string
- data_inicio: string
- descricao_servico: string
- epis_requeridos: string | null
- equipamento_id: string | null
- executante_nome: string
- id: string
- isolamentos: string | null
- medidas_controle: string | null
- numero_pt: number
- observacoes: string | null
- os_id: string | null
- riscos_identificados: string | null
- status: string | null
- supervisor_nome: string
- tag: string | null
- tipo: string | null
- updated_at: string

## planos_preventivos
- ativo: boolean | null
- checklist: Json | null
- codigo: string
- condicao_disparo: string | null
- created_at: string
- descricao: string | null
- equipamento_id: string | null
- especialidade: string | null
- frequencia_ciclos: number | null
- frequencia_dias: number | null
- id: string
- instrucoes: string | null
- materiais_previstos: Json | null
- nome: string
- proxima_execucao: string | null
- responsavel_nome: string | null
- tag: string | null
- tempo_estimado_min: number | null
- tipo_gatilho: string | null
- ultima_execucao: string | null
- updated_at: string

## plantas
- ativo: boolean
- codigo: string
- created_at: string
- endereco: string | null
- id: string
- nome: string
- responsavel: string | null
- updated_at: string

## profiles
- created_at: string
- id: string
- nome: string
- updated_at: string

## rate_limits
- endpoint: string
- id: string
- request_count: number | null
- user_id: string | null
- window_start: string

## security_logs
- action: string
- created_at: string
- error_message: string | null
- id: string
- ip_address: string | null
- metadata: Json | null
- resource: string
- resource_id: string | null
- success: boolean | null
- user_id: string | null

## servicos_preventivos
- atividade_id: string
- concluido: boolean
- created_at: string
- descricao: string
- id: string
- observacoes: string | null
- ordem: number
- tempo_estimado_min: number
- updated_at: string

## sistemas
- area_id: string
- ativo: boolean
- codigo: string
- created_at: string
- descricao: string | null
- funcao_principal: string | null
- id: string
- nome: string
- updated_at: string

## solicitacoes_manutencao
- classificacao: string | null
- created_at: string
- data_aprovacao: string | null
- data_limite: string | null
- descricao_falha: string
- equipamento_id: string | null
- id: string
- impacto: string | null
- numero_solicitacao: number
- observacoes: string | null
- os_id: string | null
- sla_horas: number | null
- solicitante_nome: string
- solicitante_setor: string | null
- status: string | null
- tag: string
- updated_at: string
- usuario_aprovacao: string | null

## templates_preventivos
- created_at: string
- descricao: string | null
- estrutura: Json
- id: string
- nome: string
- updated_at: string

## user_roles
- created_at: string
- id: string
- role: Database["public"]["Enums"]["app_role"]
- user_id: string

