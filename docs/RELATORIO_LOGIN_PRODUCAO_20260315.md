# Relatório Técnico - Login Produção (2026-03-15)

## Fase 1 - Projeto Supabase real do frontend publicado

- Domínio: `gppis.com.br/login`
  - Asset principal: `/assets/index-Ca6Ac19d.js`
  - Supabase URL no bundle: `https://dvwsferonoczgmvfubgu.supabase.co`
  - Publishable key detectada no bundle (prefixo): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX`
  - Ref da key (decodificada): `dvwsferonoczgmvfubgu`

- Domínio: `owner.gppis.com.br/login`
  - Asset principal: `/assets/index-CYFSprME.js`
  - Supabase URL no bundle: `https://dvwsferonoczgmvfubgu.supabase.co`
  - Bundle contém referência ao mesmo project-ref (`dvwsferonoczgmvfubgu`).

Conclusão: os dois frontends publicados apontam para o mesmo project-ref `dvwsferonoczgmvfubgu`.

## Fase 2 - Endpoint real de login

- O bundle publicado contém `auth-login`.
- O bundle publicado não aponta para `/auth/v1/token` como endpoint principal de login no fluxo atual.
- Endpoint efetivo validado: `https://dvwsferonoczgmvfubgu.supabase.co/functions/v1/auth-login`

## Fase 3 - Payload enviado

No código do frontend, a chamada usa exatamente:

```json
{
  "email": "...",
  "password": "..."
}
```

Não há envio de `username`, `login` ou `user` no fluxo principal.

## Fase 4 - Headers

Validação HTTP feita com headers equivalentes do frontend:

- `apikey: <publishable_key>`
- `Content-Type: application/json`
- `Origin: https://gppis.com.br`

O backend respondeu com CORS permitindo a origem:

- `Access-Control-Allow-Origin: https://gppis.com.br`

## Fase 5 - Resposta real do backend

### Caso 400 (payload vazio)

- Status: `HTTP/1.1 400 Bad Request`
- Body:

```json
{"error":"Email and password required","details":null}
```

### Caso 401 (credencial inválida)

- Status: `HTTP/1.1 401 Unauthorized`
- Body:

```json
{"error":"Invalid credentials","details":null}
```

### Evidência histórica capturada no mesmo ambiente

Antes do hotfix, houve:

- Status: `HTTP/1.1 500 Internal Server Error`
- Body:

```json
{"error":"Falha ao validar tentativas de login","details":{"reason":"Could not find the table 'public.login_attempts' in the schema cache"}}
```

## Fase 6 - AuthContext

Fluxo confirmado:

1. `supabase.functions.invoke('auth-login', { body: { email, password } })`
2. Em sucesso, aplica `supabase.auth.setSession({ access_token, refresh_token })`
3. Lê sessão (`supabase.auth.getSession()`), usuário (`supabase.auth.getUser()`), resolve perfil/tenant e salva em estado.

## Fase 7 - Persistência de sessão

Implementação confirma persistência via `setSession` + `getSession` no fluxo de login.

## Fase 8 - Redirecionamento

No login web:

- quando autenticado, redireciona para tenant host quando necessário;
- caso contrário, segue para rota pós-login (ex.: dashboard) via `navigate(...)`.

## Diagnóstico objetivo

1. Não foi encontrado erro de project-ref divergente entre frontend publicado e backend alvo.
2. O endpoint de login publicado é `functions/v1/auth-login`.
3. O backend atual responde funcionalmente com `400` e `401` nos cenários testados.
4. A falha técnica real identificada em produção foi a dependência da tabela `login_attempts` (erro 500 histórico), já observada e mitigada.

Ponto exato da falha identificado com dados reais:

- falha estrutural anterior no backend (`public.login_attempts` ausente na cache de schema), causando erro técnico em tempo de execução.

Estado atual verificado:

- não foi reproduzido `503` nos testes HTTP atuais;
- respostas atuais são funcionais (400/401) para entradas inválidas.
