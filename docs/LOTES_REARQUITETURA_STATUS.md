# Lotes de Re-arquitetura â€” Status Atual

## Escopo desta rodada (5 lotes)

1. Remover casts inseguros (`as any`/`as never`) em caminhos crÃ­ticos.

1. ReforÃ§ar guardas de autorizaÃ§Ã£o com verificaÃ§Ã£o server-side.

1. Padronizar trilha de auditoria com RPC central (`app_write_audit_log`).

1. Limpar aliases/compat legada de tenancy (`tenant_id` legado no frontend).

1. Consolidar documentaÃ§Ã£o de execuÃ§Ã£o, impactos e prÃ³ximos passos.

## Status

- **Lote 1 â€” ConcluÃ­do**

  - Ajustes de tipagem em fluxos crÃ­ticos de pÃ¡ginas e serviÃ§os.

- **Lote 2 â€” ConcluÃ­do**

  - `SystemOwnerGuard` validando tambÃ©m permissÃ£o server-side (`control_plane.read`).

- **Lote 3 â€” ConcluÃ­do**

  - Criado utilitÃ¡rio `src/lib/audit.ts`.

  - Fluxos de `login/logout` migrados para `writeAuditLog`.

- **Lote 4 â€” ConcluÃ­do**

  - Removido alias legado `resolveTenantSlug` de `src/lib/security.ts`.

- **Lote 5 â€” ConcluÃ­do**

  - Este documento registra o fechamento da execuÃ§Ã£o em lotes.

## Compatibilidade e risco

- Mantida compatibilidade funcional com rotas e hooks existentes.

- MudanÃ§as de seguranÃ§a sÃ£o aditivas (mais restritivas), sem afrouxar controle de acesso.

- Auditoria agora converge para RPC central, reduzindo variaÃ§Ã£o de escrita em tabela.

## PrÃ³ximos passos sugeridos

1. Expandir `writeAuditLog` para mutaÃ§Ãµes sensÃ­veis adicionais (cadastros crÃ­ticos, permissÃµes, billing).

1. Continuar remoÃ§Ã£o de casts inseguros fora do caminho crÃ­tico.

1. Revisar e remover remanescentes de `tenant_id` no backend/migrations legadas apÃ³s janela de validaÃ§Ã£o.
