# Estrategia de Backup e Recuperacao - SaaS Multi-tenant

## 1. Objetivo
Definir uma estrategia operacional de backup e recuperacao para ambiente de producao SaaS multi-tenant, com metas claras de continuidade, auditoria e restauracao por tenant.

## 2. Metas de continuidade
- RPO (perda maxima aceitavel): 15 minutos.
- RTO (tempo maximo para retomada): 60 minutos para ambiente inteiro.
- RTO por tenant (restauracao logica): 120 minutos.

## 3. Politica de backup
- Backup incremental do banco: a cada 15 minutos.
- Backup full do banco: diario, 02:00 UTC.
- Snapshot semanal imutavel: domingo, 03:00 UTC.
- Export logico por tenant (tabelas criticas): diario, 04:00 UTC.

Tabelas criticas para export logico por tenant:
- empresas
- usuarios
- ordens_servico
- execucoes_os
- materiais_os
- contratos
- subscriptions
- audit_logs
- operational_logs

## 4. Retencao
- Incrementais: 7 dias.
- Full diarios: 30 dias.
- Semanais imutaveis: 12 semanas.
- Mensais imutaveis: 12 meses.

## 5. Seguranca e compliance
- Criptografia em repouso: AES-256.
- Criptografia em transito: TLS 1.2+.
- Armazenamento em bucket segregado com bloqueio de alteracao (WORM/immutability).
- Controle de acesso minimo necessario (principio do menor privilegio).
- Registro de auditoria de toda operacao de backup/restore.

## 6. Procedimento de restauracao
### 6.1 Restauracao total
1. Abrir incidente e congelar mudancas de schema.
2. Provisionar ambiente limpo de recuperacao.
3. Restaurar ultimo full + cadeia incremental.
4. Rodar validacoes de integridade (contagem, checks de FK, checks de tenant).
5. Liberar ambiente e monitorar por 60 minutos.

### 6.2 Restauracao por tenant
1. Identificar tenant (empresa_id) e janela de restauracao.
2. Restaurar snapshot para ambiente temporario.
3. Exportar somente dados do tenant alvo.
4. Aplicar import controlado em producao com validacao de conflitos.
5. Registrar trilha de auditoria (ator, horario, tenant, escopo).

## 7. Testes obrigatorios
- Teste mensal de restauracao total em ambiente de homologacao.
- Teste quinzenal de restauracao por tenant.
- Simulacao trimestral de desastre com checklist de crise.

## 8. Observabilidade e alertas
- Alerta imediato para falha de backup incremental/full.
- Alerta para tempo de backup acima do baseline.
- Painel com taxa de sucesso, duracao, ultimo backup valido e lag de RPO.

## 9. Checklist operacional
- Verificar jobs concluindo no horario esperado.
- Validar checksum e consistencia dos artefatos.
- Confirmar expiracao de retencao automatica.
- Revisar permissoes de acesso ao storage.

## 10. Recomendacoes finais
- Versionar runbooks de backup/restore no repositorio.
- Automatizar validacao pos-restore com consultas de consistencia multi-tenant.
- Integrar alertas com canal de plantao (on-call) e escalonamento automatico.
