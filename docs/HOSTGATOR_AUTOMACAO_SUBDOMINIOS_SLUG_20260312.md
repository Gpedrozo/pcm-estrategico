<!-- markdownlint-disable MD032 MD029 -->

# Automacao de Subdominios por Slug (HostGator)

Data: 2026-03-12

## 1) O que ja foi implementado no backend

No fluxo de empresa:
1. `create_company` agora valida/normaliza slug.
2. Gera dominio gerenciado automaticamente: `slug.<TENANT_BASE_DOMAIN>`.
3. Salva em `public.empresa_config.dominio_custom`.
4. `update_company` ao trocar slug atualiza dominio gerenciado sem sobrescrever dominio custom manual.

Impacto:
1. Ao criar empresa, o sistema ja conhece o hostname do tenant.
2. Login tenant e lookup por dominio passam a funcionar sem ajuste manual em banco.

## 2) Melhor estrategia para HostGator (recomendada)

Use wildcard DNS + wildcard subdomain uma unica vez.

Configuracao unica no HostGator:
1. Criar registro DNS wildcard `*.<seu_dominio_base>` apontando para o app (A ou CNAME conforme hosting).
2. No cPanel/Apache (ou Nginx), configurar wildcard subdomain para o mesmo document root da aplicacao.

Resultado:
1. Nao precisa criar subdominio por empresa via API.
2. Qualquer `slug.<dominio_base>` passa a resolver automaticamente.
3. O sistema decide qual empresa abrir via `empresa_config.dominio_custom`.

## 3) Opcao avancada (nao recomendada como primeira fase)

Provisionamento por API cPanel/WHM a cada nova empresa.

Quando usar:
1. Se voce realmente precisar criar subdominio fisico individual para cada tenant.

Fluxo:
1. `create_company` grava empresa e dominio no banco.
2. Enfileira job de provisionamento.
3. Worker chama API do cPanel para criar subdominio.
4. Atualiza status (`pending`, `active`, `error`).

Riscos:
1. Dependencia de credenciais e limites de API da hospedagem.
2. Mais pontos de falha do que wildcard.

## 4) Variaveis de ambiente

Definir no backend/edge function:
1. `TENANT_BASE_DOMAIN=gppis.com.br`

Opcional no frontend:
1. `VITE_TENANT_BASE_DOMAIN=gppis.com.br`

## 5) Padrao de slug recomendado

1. minusculo
2. letras + numeros + hifen
3. sem acento
4. tamanho maximo 48
5. unico por empresa

Exemplo:
1. Empresa: `Metalurgica Alfa`
2. Slug: `metalurgica-alfa`
3. Dominio gerado: `metalurgica-alfa.gppis.com.br`

## 6) Checklist de ativacao no HostGator

1. Confirmar DNS wildcard `*.gppis.com.br`.
2. Confirmar owner domain separado (`owner.gppis.com.br`).
3. Confirmar app aceita hostnames de tenant.
4. Criar empresa de teste e validar acesso em `slug.gppis.com.br`.
5. Validar login tenant e branding por `dominio_custom`.
