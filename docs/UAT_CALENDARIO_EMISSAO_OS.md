# UAT - Calendário com Emissão de O.S e Ficha de Execução

## Objetivo
Validar o fluxo completo de programação para execução: agenda -> emissão de O.S -> impressão de ficha -> conclusão.

## Escopo validado nesta entrega
- Programação: ação de `Emitir O.S` por item da agenda.
- Programação: ação `Imprimir ficha para execução` para itens de preventiva/lubrificação.
- Nova O.S: remoção de `Custo Estimado` da UI (campo não persistido no schema atual).
- O.S: criação com `status` obrigatório para evitar falha de constraint.

## Pré-requisitos
- Usuário com permissão para emitir O.S.
- Equipamento do item com TAG preenchida.
- Agenda com itens do tipo `preventiva` e `lubrificacao`.

## Casos de teste

### CT-01 Emitir O.S a partir do calendário
1. Acessar `Programação`.
2. Abrir item `preventiva` ou `lubrificacao`.
3. Clicar em `Emitir O.S`.
4. Verificar toast de sucesso com número da O.S.
5. Confirmar no `Histórico O.S` que a O.S foi criada.

Resultado esperado:
- O.S criada sem erro técnico.
- Item da agenda atualizado para status `emitido`.

### CT-02 Bloqueio de emissão sem TAG
1. Abrir item da agenda sem equipamento com TAG.
2. Clicar em `Emitir O.S`.

Resultado esperado:
- Exibe mensagem amigável informando ausência de TAG.
- Não cria O.S.

### CT-03 Impressão de ficha (preventiva/lubrificação)
1. Abrir item `preventiva` ou `lubrificacao` na agenda.
2. Clicar em `Imprimir ficha para execução`.

Resultado esperado:
- Janela de impressão abre com dados da atividade.
- Ficha contém campos para anotações e assinaturas.

### CT-04 Fluxo Nova O.S sem campo inválido
1. Acessar `Emitir O.S`.
2. Confirmar que campo `Custo Estimado` não é exibido.
3. Criar O.S normalmente.

Resultado esperado:
- O.S salva com sucesso.
- Nenhum erro de coluna inexistente/constraint no front.

### CT-05 Reagendamento e execução na agenda
1. Abrir item da agenda.
2. Reagendar data e salvar.
3. Marcar como executado.

Resultado esperado:
- Alterações persistidas no calendário.
- Status visual atualizado conforme regra de tons.

## Critérios de aceite
- 100% dos casos acima aprovados no tenant de homologação.
- Sem erro técnico em toast durante emissão de O.S.
- Build e suíte automatizada verdes.

## Rollout sugerido
1. Deploy em homologação.
2. Executar CT-01 a CT-05.
3. Deploy produção com janela curta.
4. Smoke test: emitir 1 O.S via calendário + imprimir ficha.
5. Monitorar por 24h erros de criação de O.S.
