# Smoke Test Produção - PCM Estratégico

Data: 2026-03-08
Objetivo: validar rapidamente fluxos críticos com inserção real de dados em produção.
Escopo: Solicitações, O.S., Programação, Preventiva, Preditiva, Materiais, SSMA, FMEA/RCA.

## Pré-condições

- Usuário autenticado com permissões operacionais (não somente leitura).
- Base já auditada: 46 tabelas referenciadas, 46 existentes, 0 faltantes.
- Executar em ambiente de produção com uma TAG de equipamento válida.

## Dados padrão para o teste

- TAG equipamento: EQP-SMOKE-01 (ou uma TAG real existente)
- Solicitante: Operador Smoke
- Setor: Produção
- Descrição falha: Vibração anormal em mancal
- Classificação: URGENTE
- Impacto: ALTO
- Mecânico: Mecânico Smoke
- Material: Graxa EP2 1kg

## Roteiro rápido (10-15 minutos)

### 1) Solicitações (criação)

Passos:
1. Ir em Solicitações.
2. Clicar em Nova solicitação.
3. Preencher TAG, solicitante, setor, descrição, classificação URGENTE, impacto ALTO.
4. Salvar.

Esperado:
- Registro criado com status PENDENTE.
- SLA calculado automaticamente (urgente = 8h).
- Data limite preenchida.
- Solicitação aparece na lista sem erro.

### 2) O.S. (emissão a partir da solicitação)

Passos:
1. Abrir a solicitação recém-criada.
2. Converter para O.S. (ou emitir O.S. no fluxo equivalente).
3. Confirmar dados básicos e salvar O.S.

Esperado:
- O.S. criada com número válido.
- Relação solicitação -> O.S. persistida.
- O.S. aparece em Histórico/Backlog/Programação sem erro de coluna ou tabela.

### 3) Programação (agenda e impressão)

Passos:
1. Ir em Programação.
2. Localizar evento/O.S. criada.
3. Abrir evento e validar vínculo por TAG/equipamento.
4. Acionar impressão da ficha.

Esperado:
- Evento visível na agenda.
- TAG resolvida corretamente no card/detalhe.
- Impressão abre sem quebrar layout e sem erro de dados.

### 4) Preventiva (plano com equipamento)

Passos:
1. Ir em Preventiva.
2. Criar plano preventivo novo.
3. Selecionar equipamento obrigatório e salvar.

Esperado:
- Plano salvo com equipamento_id e TAG.
- Plano aparece na listagem e na busca por TAG.
- Sem erro de persistência.

### 5) Preditiva (medição)

Passos:
1. Ir em Preditiva.
2. Registrar medição para o mesmo equipamento.
3. Salvar.

Esperado:
- Medição salva com equipamento_id.
- Registro aparece na lista/histórico preditivo.
- Sem erro de schema.

### 6) Materiais (movimentação)

Passos:
1. Ir em Materiais.
2. Registrar entrada ou saída de item de teste.
3. (Opcional) Vincular material na O.S. criada.

Esperado:
- Movimentação persistida.
- Saldo/registro atualizado.
- Vínculo materiais_os (quando aplicado) funcionando.

### 7) SSMA (registro básico)

Passos:
1. Ir em SSMA.
2. Criar um incidente simples ou permissão de trabalho de teste.
3. Salvar.

Esperado:
- Registro salvo e listável.
- Sem erro de escrita/leitura no módulo.

### 8) FMEA / RCA (cadastro simples)

Passos:
1. Ir em FMEA e criar item mínimo.
2. Ir em RCA e criar análise/ação corretiva mínima.
3. Salvar ambos.

Esperado:
- FMEA persistido e exibido na grade.
- RCA e ação corretiva persistidos e consultáveis.

## Critério de aprovação do smoke

Aprovado se:
- Todos os 8 blocos acima salvarem e listarem dados com sucesso.
- Nenhum erro de tabela/coluna ausente no console/requisição.
- Fluxo Solicitação -> O.S. -> Programação/Impressão funcionar ponta a ponta.

## Se algum passo falhar

Coletar e enviar:
- Módulo e ação exata executada.
- Mensagem de erro exibida na interface.
- Print da aba Network da requisição com status e payload.
- TAG ou ID do registro usado no teste.
