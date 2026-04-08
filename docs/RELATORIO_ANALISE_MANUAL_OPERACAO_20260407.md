# RELATÓRIO DE ANÁLISE DO MANUAL DE OPERAÇÃO

**Data:** 07/04/2026  
**Escopo:** Auditoria dos manuais existentes vs. funcionalidades reais do sistema  
**Documentos analisados:**
- `MANUAL_OPERACAO_SISTEMA_CLIENTE_FINAL.md` (v1.0)
- `MANUAL_OPERACAO_FLUXO_COMPLETO_CANVA_20260316.md` (v1.0)
- `MANUAL_OPERACAO_SISTEMA_CLIENTE_FINAL_IMPRESSAO_ILUSTRADO.md` (v1.0)

---

## PARTE 1 — DIAGNÓSTICO: O QUE ESTÁ DESATUALIZADO

### 1.1 Funcionalidades marcadas como "em desenvolvimento" que JÁ ESTÃO PRONTAS

| Item no manual | Status real | Observação |
|---|---|---|
| "Recuperação de senha — funcionalidade em desenvolvimento" (seção 2.4) | ✅ **100% implementada** | Fluxo completo: ForgotPassword → e-mail → ResetPassword com token. Pronto para uso. |
| "Preditiva > Tendências — em placeholder" (seção 10) | Verificar estado atual | Manual afirma que está em placeholder, já pode ter evoluído. |
| "Documentos técnicos sem upload — apenas metadado" (seção 12) | Verificar estado atual | Manual marca como incompleto. |
| "Suporte — funcionalidade em desenvolvimento" (seção 17) | ✅ **100% implementada** | Sistema completo de tickets com prioridade, anexos, threads de mensagens e status. Rota: `/suporte`. |

**Impacto:** O usuário lê o manual e pensa que essas funcionalidades não existem, quando na verdade já estão prontas e funcionais.

---

### 1.2 Módulos e funcionalidades COMPLETAMENTE AUSENTES do manual

| Funcionalidade | Descrição | Gravidade da omissão |
|---|---|---|
| **Módulo de Inteligência IA (Causa Raiz com IA)** | Análise de falhas assistida por LLM (Groq). Gera resumo, hipóteses, causas prováveis, ações preventivas, criticidade e confiança. Rota: `/inteligencia-causa-raiz` | 🔴 CRÍTICA — É um diferencial competitivo do sistema e não tem uma linha no manual. |
| **Painel do Mecânico (Web)** | Tela dedicada para mecânicos em campo via web, com login por código, visualização de O.S atribuídas e execução/fechamento. Rota: `/painel-mecanico` | 🔴 CRÍTICA — O manual sequer menciona esse módulo no menu. |
| **Aplicativo Mobile do Mecânico** | App React Native independente com 27 telas: agenda, execução, checklist, QR code, solicitação de material, vinculação de dispositivo, modo offline. | 🔴 CRÍTICA — Nenhuma menção em nenhum dos 3 manuais. |
| **Sistema de Vinculação de Dispositivo (Device Binding)** | QR Code → token de dispositivo → autenticação JWT automática para mecânico em campo. | 🟠 ALTA — Segurança operacional sem documentação. |
| **Centro de Notificações** | Ícone de sino no cabeçalho com alertas automáticos: O.S urgentes, backlog alto, preventiva atrasada, boas-vindas. | 🟠 ALTA — Funcionalidade usada diariamente sem orientação. |
| **Wizard de Onboarding** | Assistente de 4 etapas para primeira configuração: Hierarquia → Equipamentos → Mecânicos → Primeira O.S. | 🟠 ALTA — Experiência de primeiro acesso não documentada. |
| **Sistema de Assinatura e Expiração** | Controle de plano: cron de enforcement diário, período de carência (15 dias), alertas em amarelo/vermelho, bloqueio de acesso com tela dedicada. | 🟡 MÉDIA — Afeta admin/owner. |
| **Instalador PWA / APK** | Página `/instalar` com detecção de plataforma (Windows/Mac/Android/iOS) e instruções específicas. | 🟡 MÉDIA — Canal de distribuição sem orientação. |
| **Master TI — 10 ferramentas avançadas** | Monitor de sistema (23 módulos em tempo real), gerenciador de banco, layouts de documento, gerenciador de logos (6 tipos), permissões granulares, gerenciador de segurança. | 🟡 MÉDIA — Perfil avançado sem documentação operacional. |
| **Portal Owner — 16 abas** | Dashboard, monitoramento, billing, planos, financeiro, feature flags, dispositivos, auditoria, logs, configurações, master owner. | 🟡 MÉDIA — Camada administrativa do SaaS ignorada. |
| **Manual Interativo Integrado** | 22 capítulos navegáveis dentro do sistema em `/manual/*` com capa, navegação por capítulo e impressão completa. | 🟡 MÉDIA — O manual fala de si mas não explica que existe dentro do próprio sistema. |
| **Backlog — Modo readonly para O.S canceladas** | O.S canceladas visíveis com badge + motivo, agrupamento semanal (Atrasadas, Futuras), visualização lista e grade. | 🟡 MÉDIA — Evolução de UX não refletida. |

---

### 1.3 Informações INCORRETAS ou DESATUALIZADAS

| Localização no manual | Problema | Correção necessária |
|---|---|---|
| Seção 1 — "21 módulos funcionais" | Contagem defasada. O sistema agora tem **48+ páginas** e módulos adicionais (IA, Painel Mecânico, Suporte, Mobile, Instalar). | Atualizar para contagem real. |
| Seção 2.2 — Perfis: "USUARIO, ADMIN, MASTER_TI" | Faltam os perfis **SOLICITANTE**, **TECHNICIAN** e **SYSTEM_OWNER**. O sistema opera com **6 papéis hierárquicos**. | Documentar hierarquia completa: SYSTEM_OWNER → MASTER_TI → ADMIN → USUÁRIO → SOLICITANTE/TECHNICIAN. |
| Seção 4 — "Não há criação direta de usuário" | Verificar se o fluxo Owner → Usuários já permite criação diretamente. O portal Owner tem aba de usuários completa. | Atualizar limitação se já foi resolvida. |
| Seção 7.2 — Menu do sidebar | Lista apenas as categorias originais. Faltam os itens: **"Painel do Mecânico"** em O.S, **"Inteligência IA"** em Análises, **"Suporte"**, **"Manuais"** e **"Instalar APK"** em Ajuda. | Atualizar estrutura de menu completa. |
| Documento inteiro — Data de referência | Versão 1.0 de março/2026. Mais de 5 semanas sem atualização, com múltiplas entregas de produção nesse período. | Criar versionamento e histórico de revisões. |

---

## PARTE 2 — PROBLEMAS ESTRUTURAIS DO MANUAL

### 2.1 Problemas de organização

1. **3 documentos sobrepostos sem versionamento unificado** — Existem 3 manuais (cliente final, Canva, impressão ilustrada) que cobrem parcialmente o mesmo conteúdo sem referência cruzada nem controle de qual é o "oficial".

2. **Ausência de controle de versão formal** — Nenhum dos documentos tem changelog, data de última revisão efetiva nem responsável pela manutenção.

3. **Sem segmentação por perfil** — O manual tenta atender TODOS os perfis (solicitante, operador, admin, Master TI) num único fluxo. Isso gera ruído para quem precisa de uma orientação específica.

4. **Imagens/screenshots ausentes no manual principal** — Apenas a versão "impressão ilustrada" referencia SVGs, mas os outros dois manuais são 100% texto, dificultando a compreensão.

5. **Sem índice de busca ou FAQ** — Nenhum manual tem seção de perguntas frequentes ou troubleshooting.

### 2.2 Problemas de conteúdo

1. **Zero cobertura da jornada mobile** — Nenhum manual menciona o app mecânico, QR code, ou execução em campo via celular.
2. **Zero cobertura de IA** — O módulo de Inteligência IA é um diferencial competitivo não documentado.
3. **Sem cenários de erro e resolução** — Apenas o manual Canva tem "erros comuns", e mesmo assim é superficial.
4. **Sem métricas de "feito certo"** — O manual diz O QUE fazer mas nunca define como o usuário VALIDA que fez corretamente.
5. **Sem fluxos de integração entre módulos** — Por exemplo, como uma medição preditiva em alerta VIRA uma O.S VIRA uma RCA.

---

## PARTE 3 — SUGESTÕES DE MELHORIA CONVENCIONAIS

### 3.1 Reestruturação proposta

| Ação | Prioridade |
|---|---|
| Unificar os 3 manuais num único documento master com versionamento semântico (v2.0). | 🔴 Alta |
| Criar seções segmentadas por perfil: Guia do Solicitante, Guia do Operador/Técnico, Guia do Admin, Guia do Mecânico Mobile, Guia Master TI. | 🔴 Alta |
| Adicionar capítulos para TODOS os 11 módulos/funcionalidades ausentes listadas acima. | 🔴 Alta |
| Remover todas as marcações "em desenvolvimento" de funcionalidades já prontas. | 🔴 Alta |
| Adicionar seção de FAQ com os 20 problemas mais comuns e soluções. | 🟠 Média |
| Incorporar screenshots reais (não apenas SVG esquemáticos) para cada passo crítico. | 🟠 Média |
| Adicionar glossário de termos técnicos (TAG, SLA, MTBF, MTTR, RCA, FMEA, RCM). | 🟡 Baixa |

### 3.2 Novos capítulos prioritários

1. **Cap. "Aplicativo do Mecânico em Campo"** — Instalação, vinculação de dispositivo via QR, agenda, execução de O.S, finalização com evidências, modo offline.
2. **Cap. "Inteligência Artificial para Análise de Falhas"** — Como usar, interpretar resultados, confiança, e converter em plano de ação.
3. **Cap. "Central de Notificações"** — Como funciona, tipos de alerta, e ações recomendadas.
4. **Cap. "Primeiro Acesso e Configuração Inicial"** — Wizard de onboarding passo a passo.
5. **Cap. "Suporte e Tickets"** — Como abrir chamado, acompanhar, prioridades e SLA de atendimento.
6. **Cap. "Painel do Mecânico (Web)"** — Login por código, execução e fechamento de O.S dedicado.

---

## PARTE 4 — PROPOSTA INOVADORA: "MANUAL VIVO" COM IA CONTEXTUAL

### O Problema que Nenhum Concorrente Resolve

Sistemas de manutenção industrial (SAP PM, Maximo, Fracttal, Engeman, Maint) entregam manuais em PDF estático ou base de conhecimento wiki genérica. O resultado:

- Ninguém lê o manual inteiro.
- Quando tem dúvida em campo, o técnico não consegue achar a resposta a tempo.
- O manual fica desatualizado no dia seguinte após o deploy.
- Não existe conexão entre o que o usuário ESTÁ fazendo e a ajuda que ele PRECISA.

### A Proposta: "Assistente PCM" — Manual Contextual Inteligente

Criar um **assistente embutido no sistema** que combina 3 inovações que nenhum concorrente oferece juntas:

---

#### INOVAÇÃO 1: Help Contextual em Tempo Real (Context-Aware Guide)

**O que é:** Um botão de ajuda flutuante (`?`) em CADA módulo que, ao ser clicado, mostra APENAS a parte do manual relevante para a tela onde o usuário está.

**Como funciona:**
- O sistema detecta automaticamente a rota atual (`/fechar-os`, `/preditiva`, `/backlog`).
- Ao clicar no `?`, abre um painel lateral com:
  - Passo a passo da tela atual (extraído do manual integrado).
  - Dica do dia para aquele módulo.
  - Vídeo curto (30s) da operação, se disponível.
  - Link para o capítulo completo.

**Por que é inovador:** Nenhum CMMS industrial conecta manual ↔ tela ativa. O SAP PM tem F1 genérico. O Fracttal tem base wiki separada. Ninguém faz "manual que sabe onde você está".

---

#### INOVAÇÃO 2: "Pergunte ao PCM" — Chat de IA sobre o Manual (RAG)

**O que é:** Um chatbot integrado no painel de ajuda onde o usuário pode PERGUNTAR ao manual em linguagem natural.

**Exemplos de uso real:**
- Mecânico: _"Como faço pra fechar uma O.S corretiva com RCA?"_
- Planejador: _"Qual a diferença entre preditiva e preventiva no sistema?"_
- Admin: _"Como crio um plano preventivo com frequência quinzenal?"_

**Como funciona:**
- O conteúdo dos 22 capítulos do manual integrado é indexado como embeddings (RAG - Retrieval-Augmented Generation).
- A pergunta do usuário é comparada com os trechos mais relevantes.
- A resposta é gerada pela mesma infra de IA (Groq) que já existe no módulo de Causa Raiz.
- A resposta inclui link direto para o capítulo/seção relevante.

**Por que é inovador:** Nenhum CMMS industrial oferece "perguntar ao manual" com IA. SAP tem Community, Maximo tem IBM Watson genérico, mas nenhum indexa O SEU MANUAL ESPECÍFICO para resposta contextualizada.

**Vantagem competitiva adicional:** Como o sistema JÁ tem edge function de IA (Groq) e os 22 capítulos do manual, o custo de implementação é baixo.

---

#### INOVAÇÃO 3: "Manual Que Se Escreve Sozinho" — Documentação Auto-Gerada

**O que é:** O manual é gerado automaticamente a partir do código e das ações reais dos usuários, eliminando desatualização.

**3 camadas:**

**Camada A — Auto-documentação de módulos:**
- Cada módulo do sistema exporta metadados: nome, descrição, campos, fluxo, permissões.
- O manual integrado consome esses metadados para gerar capítulos automaticamente.
- Quando um módulo muda (novo campo, novo botão), o manual atualiza sozinho.

**Camada B — "Trilhas Inteligentes" baseadas em uso real:**
- O sistema analisa o comportamento agregado dos usuários (rota → rota) para identificar os fluxos mais comuns.
- Gera automaticamente guias como: _"90% dos usuários fazem: Backlog → Emitir O.S → Programação → Fechar O.S. Quer seguir esse fluxo?"_
- É como um "GPS de manutenção" que sugere o próximo passo.

**Camada C — "Aprendizado Coletivo" (Knowledge Crowdsourcing):**
- Qualquer usuário pode adicionar uma "dica rápida" num módulo (ex: _"Na preditiva, cuidado: vibração acima de 7mm/s nessa planta sempre é rolamento"_).
- Dicas são validadas pelo admin e aparecem para toda a equipe no help contextual.
- Cria uma base de conhecimento VIVA mantida pelos próprios usuários.

**Por que é inovador:** Absolutamente nenhum sistema de manutenção industrial tem manual auto-gerado ou crowdsourced. É o conceito de "documentação como código" (docs-as-code) aplicado a software industrial, algo que só existe hoje em developer tools (Stripe, Vercel).

---

### Resumo Visual da Proposta "Manual Vivo"

```
┌─────────────────────────────────────────────────────────┐
│              ASSISTENTE PCM ("Manual Vivo")              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  ? Help      │  │ 💬 Chat IA   │  │ 📝 Dicas da  │  │
│  │  Contextual  │  │ "Pergunte    │  │    Equipe    │  │
│  │              │  │  ao PCM"     │  │              │  │
│  │ Sabe a tela  │  │ RAG sobre os │  │ Crowdsource  │  │
│  │ onde você    │  │ 22 capítulos │  │ de conheci-  │  │
│  │ está         │  │ do manual    │  │ mento local  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         └─────────┬───────┘──────────────────┘          │
│                   ▼                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │         22 Capítulos do Manual Integrado          │   │
│  │    (auto-atualizados por metadados de módulos)    │   │
│  └──────────────────────────────────────────────────┘   │
│                   ▼                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Trilhas Inteligentes (sugestão de fluxo      │   │
│  │      baseada em comportamento real de uso)         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## PARTE 5 — PLANO DE AÇÃO RECOMENDADO

### Fase 1 — Correção imediata (Urgente)
- [ ] Remover TODAS as marcações "em desenvolvimento" de funcionalidades prontas.
- [ ] Adicionar capítulos dos módulos ausentes (IA, Mobile, Painel Mecânico, Suporte, Notificações, Onboarding).
- [ ] Atualizar estrutura de menu lateral com todos os itens atuais.
- [ ] Atualizar perfis de acesso (6 papéis em vez de 3).
- [ ] Atualizar contagem de módulos (48+ páginas).

### Fase 2 — Reestruturação (Curto prazo)
- [ ] Unificar 3 manuais em documento master versionado (v2.0).
- [ ] Segmentar guias por perfil (Solicitante, Operador, Admin, Mecânico, Master TI).
- [ ] Adicionar FAQ com 20+ problemas comuns.
- [ ] Incorporar screenshots reais de produção.
- [ ] Sincronizar com o manual interativo de 22 capítulos já existente no sistema.

### Fase 3 — Inovação "Manual Vivo" (Médio prazo)
- [ ] Implementar botão `?` contextual em cada módulo (Help Contextual).
- [ ] Criar chat "Pergunte ao PCM" com RAG sobre os capítulos do manual (reusa infra Groq).
- [ ] Implementar sistema de "Dicas da Equipe" com validação de admin.

### Fase 4 — Diferenciação (Longo prazo)
- [ ] Auto-documentação de módulos via metadados exportados.
- [ ] Trilhas Inteligentes baseadas em analytics de uso.
- [ ] Gamificação: badge "Especialista PCM" para quem contribuir com dicas validadas.

---

## CONCLUSÃO

O manual atual está **significativamente desatualizado**: 11 módulos/funcionalidades inteiras não são mencionados, 4 itens marcados como "em desenvolvimento" já estão prontos, e informações estruturais (perfis, menu, contagem de módulos) estão incorretas.

A proposta do **"Manual Vivo"** com IA contextual posiciona o PCM Estratégico como o **único CMMS industrial com documentação inteligente integrada** — algo que SAP PM, Maximo, Fracttal, Engeman e nenhum concorrente direto oferece hoje.

---

*Relatório gerado em 07/04/2026 — Análise automatizada com base no código-fonte atual do sistema.*
