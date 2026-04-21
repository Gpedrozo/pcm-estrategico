-- Seed final e autonomo para analise de causa raiz da TAG RACAO-001
-- Objetivo: garantir dados suficientes para o motor deterministico criar plano preventivo automaticamente.
-- Execucao: cole este arquivo inteiro no SQL Editor do Supabase e execute uma vez.

DO $$
DECLARE
  v_empresa_id uuid;
  v_equip_id uuid;
  v_mat_id uuid;
  v_os_ids uuid[] := ARRAY[]::uuid[];
  v_os_id uuid;
  v_has_fmea boolean;
  v_has_fmea_rpn boolean;
  v_has_fmea_status boolean;
  v_has_anomalias boolean;
  v_has_anomalia_status boolean;
  v_has_anomalia_tag boolean;
  v_has_anomalia_equip_id boolean;
BEGIN
  -- 1) Empresa alvo (automatica)
  SELECT e.id
    INTO v_empresa_id
  FROM empresas e
  ORDER BY e.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada em empresas.';
  END IF;

  -- 2) Detecta tabelas/colunas opcionais para evitar falhas por schema diferente
  SELECT to_regclass('public.fmea') IS NOT NULL INTO v_has_fmea;
  IF v_has_fmea THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fmea' AND column_name = 'rpn'
    ) INTO v_has_fmea_rpn;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fmea' AND column_name = 'status'
    ) INTO v_has_fmea_status;
  END IF;

  SELECT to_regclass('public.anomalias_inspecao') IS NOT NULL INTO v_has_anomalias;
  IF v_has_anomalias THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anomalias_inspecao' AND column_name = 'status'
    ) INTO v_has_anomalia_status;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anomalias_inspecao' AND column_name = 'tag'
    ) INTO v_has_anomalia_tag;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anomalias_inspecao' AND column_name = 'equipamento_id'
    ) INTO v_has_anomalia_equip_id;
  END IF;

  -- 3) Cleanup idempotente do cenario RACAO-001 para a empresa alvo
  SELECT id INTO v_equip_id
  FROM equipamentos
  WHERE empresa_id = v_empresa_id
    AND tag = 'RACAO-001'
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_equip_id IS NOT NULL THEN
    SELECT array_agg(id)
      INTO v_os_ids
    FROM ordens_servico
    WHERE empresa_id = v_empresa_id
      AND tag = 'RACAO-001';

    IF v_os_ids IS NOT NULL AND array_length(v_os_ids, 1) > 0 THEN
      DELETE FROM execucoes_os
      WHERE empresa_id = v_empresa_id
        AND os_id = ANY(v_os_ids);

      DELETE FROM materiais_os
      WHERE empresa_id = v_empresa_id
        AND os_id = ANY(v_os_ids);

      DELETE FROM paradas_equipamento
      WHERE empresa_id = v_empresa_id
        AND os_id = ANY(v_os_ids);

      DELETE FROM ordens_servico
      WHERE empresa_id = v_empresa_id
        AND id = ANY(v_os_ids);
    END IF;

    DELETE FROM medicoes_preditivas
    WHERE empresa_id = v_empresa_id
      AND tag = 'RACAO-001';

    DELETE FROM solicitacoes_manutencao
    WHERE empresa_id = v_empresa_id
      AND tag = 'RACAO-001';

    IF v_has_fmea THEN
      DELETE FROM fmea
      WHERE empresa_id = v_empresa_id
        AND tag = 'RACAO-001';
    END IF;

    IF v_has_anomalias THEN
      IF v_has_anomalia_tag THEN
        EXECUTE 'DELETE FROM anomalias_inspecao WHERE empresa_id = $1 AND tag = $2'
        USING v_empresa_id, 'RACAO-001';
      ELSIF v_has_anomalia_equip_id THEN
        EXECUTE 'DELETE FROM anomalias_inspecao WHERE empresa_id = $1 AND equipamento_id = $2'
        USING v_empresa_id, v_equip_id;
      END IF;
    END IF;
  END IF;

  -- 4) Equipamento
  IF v_equip_id IS NULL THEN
    INSERT INTO equipamentos (
      empresa_id, tag, nome, fabricante, modelo, criticidade, nivel_risco, origem, localizacao, ativo
    ) VALUES (
      v_empresa_id, 'RACAO-001', 'Moinho de Martelos', 'TecnoMoinho', 'MM-500', 'ALTA', 'ALTO', 'proprio', 'Linha de Producao A', true
    )
    RETURNING id INTO v_equip_id;
  ELSE
    UPDATE equipamentos
      SET nome = 'Moinho de Martelos',
          fabricante = COALESCE(fabricante, 'TecnoMoinho'),
          modelo = COALESCE(modelo, 'MM-500'),
          criticidade = 'ALTA',
          nivel_risco = 'ALTO',
          origem = COALESCE(origem, 'proprio'),
          localizacao = COALESCE(localizacao, 'Linha de Producao A'),
          ativo = true,
          updated_at = now()
    WHERE id = v_equip_id;
  END IF;

  -- 5) Material recorrente
  SELECT id INTO v_mat_id
  FROM materiais
  WHERE empresa_id = v_empresa_id
    AND codigo = 'MAT-MARTELO-01'
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_mat_id IS NULL THEN
    INSERT INTO materiais (
      empresa_id, codigo, nome, unidade, custo_unitario, estoque_atual, estoque_minimo, ativo
    ) VALUES (
      v_empresa_id, 'MAT-MARTELO-01', 'Martelo de Impacto 50mm', 'UN', 87.50, 20, 5, true
    )
    RETURNING id INTO v_mat_id;
  ELSE
    UPDATE materiais
      SET nome = 'Martelo de Impacto 50mm',
          unidade = COALESCE(unidade, 'UN'),
          custo_unitario = 87.50,
          estoque_minimo = COALESCE(estoque_minimo, 5),
          ativo = true,
          updated_at = now()
    WHERE id = v_mat_id;
  END IF;

  -- 6) 6 OS corretivas fechadas com intervalo diario (MTBF ~1 dia)
  v_os_ids := ARRAY[]::uuid[];

  FOR v_os_id IN
    SELECT * FROM unnest(ARRAY[
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ])
  LOOP
    v_os_ids := array_append(v_os_ids, v_os_id);
  END LOOP;

  INSERT INTO ordens_servico (
    id, empresa_id, tag, equipamento_id, equipamento, solicitante, tipo, prioridade,
    status, problema, descricao_execucao, data_solicitacao, data_fechamento,
    causa_raiz, acao_corretiva, modo_falha
  ) VALUES
    (
      v_os_ids[1], v_empresa_id, 'RACAO-001', v_equip_id, 'Moinho de Martelos', 'Operador Linha A', 'CORRETIVA', 'ALTA',
      'FECHADA',
      'Vibracao excessiva e ruido anormal no moinho',
      'Inspecao realizada e substituicao de 4 martelos com desgaste irregular.',
      now() - interval '7 days', now() - interval '7 days' + interval '2 hours',
      'Desgaste prematuro de martelos devido a vibracao excessiva',
      'Troca de martelos e ajuste de fixacao',
      'Desbalanceamento do conjunto de martelos'
    ),
    (
      v_os_ids[2], v_empresa_id, 'RACAO-001', v_equip_id, 'Moinho de Martelos', 'Supervisor Producao', 'CORRETIVA', 'ALTA',
      'FECHADA',
      'Queda de rendimento de moagem com aumento de vibracao',
      'Substituidos 6 martelos e reaperto de componentes.',
      now() - interval '6 days', now() - interval '6 days' + interval '3 hours',
      'Desgaste prematuro de martelos devido a vibracao excessiva',
      'Troca de martelos e rebalanceamento basico',
      'Uso inadequado de materiais na alimentacao'
    ),
    (
      v_os_ids[3], v_empresa_id, 'RACAO-001', v_equip_id, 'Moinho de Martelos', 'Operador Linha A', 'CORRETIVA', 'CRITICA',
      'FECHADA',
      'Parada emergencial por vibracao severa',
      'Rebalanceamento do rotor e troca de 8 martelos.',
      now() - interval '5 days', now() - interval '5 days' + interval '4 hours',
      'Desgaste prematuro de martelos devido a vibracao excessiva',
      'Rebalanceamento e troca completa do jogo de martelos',
      'Desbalanceamento do moinho'
    ),
    (
      v_os_ids[4], v_empresa_id, 'RACAO-001', v_equip_id, 'Moinho de Martelos', 'Supervisor Producao', 'CORRETIVA', 'ALTA',
      'FECHADA',
      'Ruido metalico e oscilacao acima do normal',
      'Substituicao de 4 martelos e limpeza interna.',
      now() - interval '4 days', now() - interval '4 days' + interval '2 hours',
      'Desgaste prematuro de martelos devido a vibracao excessiva',
      'Troca parcial de martelos',
      'Falha na manutencao preventiva'
    ),
    (
      v_os_ids[5], v_empresa_id, 'RACAO-001', v_equip_id, 'Moinho de Martelos', 'Operador Linha A', 'CORRETIVA', 'ALTA',
      'FECHADA',
      'Nova reincidencia de vibracao em menos de 24h',
      'Troca de 6 martelos e verificacao do alinhamento.',
      now() - interval '3 days', now() - interval '3 days' + interval '3 hours',
      'Desgaste prematuro de martelos devido a vibracao excessiva',
      'Troca de martelos e ajuste de alinhamento',
      'Uso inadequado de materiais'
    ),
    (
      v_os_ids[6], v_empresa_id, 'RACAO-001', v_equip_id, 'Moinho de Martelos', 'Supervisor Producao', 'CORRETIVA', 'CRITICA',
      'FECHADA',
      'Parada por vibracao critica e risco de dano no rotor',
      'Inspecao final, troca de martelos e reforco de plano preventivo.',
      now() - interval '2 days', now() - interval '2 days' + interval '5 hours',
      'Desgaste prematuro de martelos devido a vibracao excessiva',
      'Troca de martelos, balanceamento e orientacao operacional',
      'Desbalanceamento do moinho'
    );

  -- 7) Execucoes com causas documentadas
  INSERT INTO execucoes_os (
    empresa_id, os_id, mecanico_nome, servico_executado, causa, tempo_execucao, custo_total, data_execucao, observacoes
  ) VALUES
    (v_empresa_id, v_os_ids[1], 'Carlos Ferreira', 'Troca de martelos', 'Falha na manutencao preventiva', 120, 420.00, now() - interval '7 days', 'Troca emergencial de componentes.'),
    (v_empresa_id, v_os_ids[2], 'Carlos Ferreira', 'Troca de martelos e reaperto', 'Desbalanceamento do moinho', 150, 610.00, now() - interval '6 days', 'Indicacao de vibracao crescente.'),
    (v_empresa_id, v_os_ids[3], 'Joao Melo', 'Rebalanceamento e troca completa', 'Uso inadequado de materiais', 240, 980.00, now() - interval '5 days', 'Material de entrada com particulas indevidas.'),
    (v_empresa_id, v_os_ids[4], 'Carlos Ferreira', 'Substituicao parcial de martelos', 'Falha na manutencao preventiva', 100, 380.00, now() - interval '4 days', 'Sem execucao preventiva no periodo.'),
    (v_empresa_id, v_os_ids[5], 'Joao Melo', 'Troca de martelos e ajuste', 'Desbalanceamento do moinho', 180, 570.00, now() - interval '3 days', 'Reincidencia em curto intervalo.'),
    (v_empresa_id, v_os_ids[6], 'Joao Melo', 'Troca final e calibracao', 'Desgaste prematuro por vibracao excessiva', 260, 1020.00, now() - interval '2 days', 'Recomendado plano preventivo dedicado.');

  -- 8) Materiais recorrentes (mesmo material em todas as OS)
  INSERT INTO materiais_os (empresa_id, os_id, material_id, quantidade, custo_unitario)
  VALUES
    (v_empresa_id, v_os_ids[1], v_mat_id, 4, 87.50),
    (v_empresa_id, v_os_ids[2], v_mat_id, 6, 87.50),
    (v_empresa_id, v_os_ids[3], v_mat_id, 8, 87.50),
    (v_empresa_id, v_os_ids[4], v_mat_id, 4, 87.50),
    (v_empresa_id, v_os_ids[5], v_mat_id, 6, 87.50),
    (v_empresa_id, v_os_ids[6], v_mat_id, 8, 87.50);

  -- 9) Downtime elevado (>= 4h no total)
  INSERT INTO paradas_equipamento (empresa_id, equipamento_id, tipo, inicio, fim, observacao, os_id)
  VALUES
    (v_empresa_id, v_equip_id, 'CORRETIVA', now() - interval '7 days 2 hours', now() - interval '7 days', 'Parada por vibracao.', v_os_ids[1]),
    (v_empresa_id, v_equip_id, 'CORRETIVA', now() - interval '6 days 3 hours', now() - interval '6 days', 'Parada por oscilacao.', v_os_ids[2]),
    (v_empresa_id, v_equip_id, 'CORRETIVA', now() - interval '5 days 4 hours', now() - interval '5 days', 'Parada critica.', v_os_ids[3]);

  -- 10) FMEA com alto risco (se tabela existir)
  IF v_has_fmea THEN
    IF v_has_fmea_rpn AND v_has_fmea_status THEN
      EXECUTE $fmea_full$
        INSERT INTO fmea (
          empresa_id, equipamento_id, tag, funcao, falha_funcional, modo_falha, efeito_falha, causa_falha,
          severidade, ocorrencia, deteccao, rpn, acao_recomendada, status
        ) VALUES
        ($1, $2, 'RACAO-001',
         'Triturar materia-prima para racao',
         'Moagem fora da especificacao',
         'Desgaste excessivo dos martelos',
         'Paradas frequentes e perda de eficiencia',
         'Vibracao excessiva e desbalanceamento',
         8, 6, 3, 144,
         'Implementar manutencao preventiva regular e balanceamento do moinho',
         'ABERTA')
      $fmea_full$
      USING v_empresa_id, v_equip_id;
    ELSIF v_has_fmea_rpn THEN
      EXECUTE $fmea_rpn$
        INSERT INTO fmea (
          empresa_id, equipamento_id, tag, funcao, falha_funcional, modo_falha, efeito_falha, causa_falha,
          rpn, acao_recomendada
        ) VALUES
        ($1, $2, 'RACAO-001',
         'Triturar materia-prima para racao',
         'Moagem fora da especificacao',
         'Desgaste excessivo dos martelos',
         'Paradas frequentes e perda de eficiencia',
         'Vibracao excessiva e desbalanceamento',
         144,
         'Implementar manutencao preventiva regular e balanceamento do moinho')
      $fmea_rpn$
      USING v_empresa_id, v_equip_id;
    ELSE
      EXECUTE $fmea_min$
        INSERT INTO fmea (
          empresa_id, equipamento_id, tag, funcao, falha_funcional, modo_falha, efeito_falha, causa_falha, acao_recomendada
        ) VALUES
        ($1, $2, 'RACAO-001',
         'Triturar materia-prima para racao',
         'Moagem fora da especificacao',
         'Desgaste excessivo dos martelos',
         'Paradas frequentes e perda de eficiencia',
         'Vibracao excessiva e desbalanceamento',
         'Implementar manutencao preventiva regular e balanceamento do moinho')
      $fmea_min$
      USING v_empresa_id, v_equip_id;
    END IF;
  END IF;

  -- 11) Preditiva critica
  INSERT INTO medicoes_preditivas (
    empresa_id, equipamento_id, tag, tipo_medicao, valor, limite_alerta, limite_critico, status, observacoes, responsavel_nome
  ) VALUES
    (v_empresa_id, v_equip_id, 'RACAO-001', 'Vibracao', 12.8, 5.0, 10.0, 'CRITICO', 'Vibracao acima do limite critico no rolamento.', 'Carlos Ferreira'),
    (v_empresa_id, v_equip_id, 'RACAO-001', 'Temperatura', 78.5, 65.0, 75.0, 'CRITICO', 'Temperatura elevada com risco de falha.', 'Joao Melo');

  -- 12) Anomalias abertas (se tabela existir)
  IF v_has_anomalias THEN
    IF v_has_anomalia_status AND v_has_anomalia_tag AND v_has_anomalia_equip_id THEN
      EXECUTE $anom_full$
        INSERT INTO anomalias_inspecao (empresa_id, inspecao_id, equipamento_id, tag, descricao, severidade, status)
        VALUES
        ($1, NULL, $2, 'RACAO-001', 'Martelos com desgaste irregular e assimetria visual.', 'ALTA', 'ABERTA'),
        ($1, NULL, $2, 'RACAO-001', 'Ruido metalico anormal durante inspecao operacional.', 'MEDIA', 'ABERTA')
      $anom_full$
      USING v_empresa_id, v_equip_id;
    ELSIF v_has_anomalia_status AND v_has_anomalia_tag THEN
      EXECUTE $anom_tag_status$
        INSERT INTO anomalias_inspecao (empresa_id, inspecao_id, tag, descricao, severidade, status)
        VALUES
        ($1, NULL, 'RACAO-001', 'Martelos com desgaste irregular e assimetria visual.', 'ALTA', 'ABERTA'),
        ($1, NULL, 'RACAO-001', 'Ruido metalico anormal durante inspecao operacional.', 'MEDIA', 'ABERTA')
      $anom_tag_status$
      USING v_empresa_id;
    ELSIF v_has_anomalia_tag THEN
      EXECUTE $anom_tag_only$
        INSERT INTO anomalias_inspecao (empresa_id, inspecao_id, tag, descricao, severidade)
        VALUES
        ($1, NULL, 'RACAO-001', 'Martelos com desgaste irregular e assimetria visual.', 'ALTA'),
        ($1, NULL, 'RACAO-001', 'Ruido metalico anormal durante inspecao operacional.', 'MEDIA')
      $anom_tag_only$
      USING v_empresa_id;
    ELSE
      EXECUTE $anom_min$
        INSERT INTO anomalias_inspecao (empresa_id, inspecao_id, descricao, severidade)
        VALUES
        ($1, NULL, 'Martelos com desgaste irregular e assimetria visual.', 'ALTA'),
        ($1, NULL, 'Ruido metalico anormal durante inspecao operacional.', 'MEDIA')
      $anom_min$
      USING v_empresa_id;
    END IF;
  END IF;

  -- 13) Solicitacoes canceladas/rejeitadas (insight manutencao diferida)
  INSERT INTO solicitacoes_manutencao (
    empresa_id, equipamento_id, tag, descricao_falha, impacto, classificacao, status,
    observacoes, solicitante_nome, solicitante_setor
  ) VALUES
    (
      v_empresa_id, v_equip_id, 'RACAO-001',
      'Troca preventiva dos martelos conforme cronograma mensal.',
      'ALTO', 'PREVENTIVA', 'CANCELADA',
      'Postergada por indisponibilidade de janela de parada.',
      'Supervisor Producao', 'Producao'
    ),
    (
      v_empresa_id, v_equip_id, 'RACAO-001',
      'Balanceamento dinamico do rotor apos reincidencias.',
      'ALTO', 'PREDITIVA', 'REJEITADA',
      'Rejeitada por prioridade de lote urgente.',
      'Supervisor Producao', 'Producao'
    );

  RAISE NOTICE 'Seed RACAO-001 concluido. Empresa: %, Equipamento: %', v_empresa_id, v_equip_id;
  RAISE NOTICE 'Esperado no motor: should_create_plan=true com score alto por recorrencia + materiais + MTBF + downtime + preditiva.';
END $$;

-- Validacao rapida apos o seed
SELECT
  (SELECT count(*) FROM ordens_servico o WHERE o.tag = 'RACAO-001' AND o.tipo = 'CORRETIVA') AS os_corretivas,
  (SELECT count(*) FROM materiais_os mo JOIN ordens_servico o ON o.id = mo.os_id WHERE o.tag = 'RACAO-001') AS materiais_os_linhas,
  (SELECT count(*) FROM medicoes_preditivas mp WHERE mp.tag = 'RACAO-001' AND upper(coalesce(mp.status, '')) = 'CRITICO') AS preditivas_criticas,
  (SELECT count(*) FROM solicitacoes_manutencao sm WHERE sm.tag = 'RACAO-001' AND sm.status IN ('CANCELADA', 'REJEITADA')) AS solicitacoes_diferidas;
