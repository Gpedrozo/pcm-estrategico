# Lotes de Re-arquitetura — Status Atual

## Escopo desta rodada (5 lotes)

1. Remover casts inseguros (`as any`/`as never`) em caminhos críticos.
2. Reforçar guardas de autorização com verificação server-side.
3. Padronizar trilha de auditoria com RPC central (`app_write_audit_log`).
4. Limpar aliases/compat legada de tenancy (`tenant_id` legado no frontend).
5. Consolidar documentação de execução, impactos e próximos passos.

## Status

- **Lote 1 — Concluído**
  - Ajustes de tipagem em fluxos críticos de páginas e serviços.
- **Lote 2 — Concluído**
  - `SystemOwnerGuard` validando também permissão server-side (`control_plane.read`).
- **Lote 3 — Concluído**
  - Criado utilitário `src/lib/audit.ts`.
  - Fluxos de `login/logout` migrados para `writeAuditLog`.
- **Lote 4 — Concluído**
  - Removido alias legado `resolveTenantSlug` de `src/lib/security.ts`.
- **Lote 5 — Concluído**
  - Este documento registra o fechamento da execução em lotes.

## Compatibilidade e risco

- Mantida compatibilidade funcional com rotas e hooks existentes.
- Mudanças de segurança são aditivas (mais restritivas), sem afrouxar controle de acesso.
- Auditoria agora converge para RPC central, reduzindo variação de escrita em tabela.

## Próximos passos sugeridos

1. Expandir `writeAuditLog` para mutações sensíveis adicionais (cadastros críticos, permissões, billing).
2. Continuar remoção de casts inseguros fora do caminho crítico.
3. Revisar e remover remanescentes de `tenant_id` no backend/migrations legadas após janela de validação.
