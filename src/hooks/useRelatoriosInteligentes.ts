import { useMemo } from 'react';
import { useOrdensServico, type OrdemServicoRow } from './useOrdensServico';
import { useExecucoesOS, type ExecucaoOSRow } from './useExecucoesOS';
import { useIndicadores } from './useIndicadores';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, differenceInHours, subDays, parseISO, format, subMonths } from 'date-fns';

// ─── Tipos ──────────────────────────────────────────────────────
export type AlertaSeveridade = 'critico' | 'alerta' | 'atencao' | 'ok';

export interface AlertaInteligente {
  id: string;
  severidade: AlertaSeveridade;
  titulo: string;
  descricao: string;
  metrica: string;
  valorAtual: number | string;
  valorMeta?: number | string;
  valorAnterior?: number | string;
  variacao?: number;
  acaoRecomendada: string;
  categoria: 'kpi' | 'backlog' | 'custo' | 'equipamento' | 'preventiva' | 'mecanico';
}

export interface InsightAutomatico {
  id: string;
  tipo: 'diagnostico' | 'tendencia' | 'causa' | 'recomendacao';
  texto: string;
  severidade: AlertaSeveridade;
  dados?: Record<string, unknown>;
}

export interface KPIComparacao {
  nome: string;
  sigla: string;
  valorAtual: number;
  valorAnterior: number;
  meta: number;
  unidade: string;
  variacao: number;
  tendencia: 'subindo' | 'caindo' | 'estavel';
  severidade: AlertaSeveridade;
  formula: string;
}

export interface BacklogBucket {
  faixa: string;
  quantidade: number;
  percentual: number;
  cor: string;
}

export interface TopEquipamentoCusto {
  tag: string;
  equipamento: string;
  custoTotal: number;
  percentualTotal: number;
  totalOS: number;
  corretivas: number;
  mtbfEquip: number;
}

export interface MecanicoDesempenho {
  nome: string;
  osExecutadas: number;
  horasTrabalhadas: number;
  tempoMedioPorOS: number;
  eficiencia: number;
}

export interface AderenciaDetalhada {
  executadasNoPrazo: number;
  executadasAtrasadas: number;
  naoExecutadas: number;
  total: number;
  percentualNoPrazo: number;
  percentualAtrasadas: number;
  percentualNaoExecutadas: number;
}

// ─── Metas Padrão (configuráveis no futuro) ─────────────────────
const METAS = {
  mttr: 2,           // horas
  mtbf: 500,         // horas
  disponibilidade: 95, // %
  backlogMax: 10,    // OS
  backlogSemanasMax: 2,
  aderenciaMin: 90,  // %
  custoMensalMax: 50000,
};

// ─── Helpers ────────────────────────────────────────────────────
const parseDateSafe = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = parseISO(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function calcVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

function tendenciaFromVariacao(v: number): 'subindo' | 'caindo' | 'estavel' {
  if (v > 5) return 'subindo';
  if (v < -5) return 'caindo';
  return 'estavel';
}

// ─── Hook Principal ─────────────────────────────────────────────
export function useRelatoriosInteligentes() {
  const { tenantId } = useAuth();
  const { data: ordensServico, isLoading: loadingOS } = useOrdensServico();
  const { data: execucoes, isLoading: loadingExec } = useExecucoesOS();
  const { data: indicadores, isLoading: loadingInd } = useIndicadores();

  const now = useMemo(() => new Date(), []);
  const periodo30d = useMemo(() => subDays(now, 30), [now]);
  const periodo60d = useMemo(() => subDays(now, 60), [now]);

  // ── Separar OS por período ──────────────────────────────────
  const { osPeriodoAtual, osPeriodoAnterior } = useMemo(() => {
    if (!ordensServico) return { osPeriodoAtual: [], osPeriodoAnterior: [] };
    const atual: OrdemServicoRow[] = [];
    const anterior: OrdemServicoRow[] = [];
    ordensServico.forEach(os => {
      const d = parseDateSafe(os.data_solicitacao);
      if (!d) return;
      if (d >= periodo30d) atual.push(os);
      else if (d >= periodo60d && d < periodo30d) anterior.push(os);
    });
    return { osPeriodoAtual: atual, osPeriodoAnterior: anterior };
  }, [ordensServico, periodo30d, periodo60d]);

  // ── Separar execuções por período ───────────────────────────
  const { execPeriodoAtual, execPeriodoAnterior } = useMemo(() => {
    if (!execucoes) return { execPeriodoAtual: [], execPeriodoAnterior: [] };
    const atual: ExecucaoOSRow[] = [];
    const anterior: ExecucaoOSRow[] = [];
    execucoes.forEach(ex => {
      const d = parseDateSafe(ex.data_execucao);
      if (!d) return;
      if (d >= periodo30d) atual.push(ex);
      else if (d >= periodo60d && d < periodo30d) anterior.push(ex);
    });
    return { execPeriodoAtual: atual, execPeriodoAnterior: anterior };
  }, [execucoes, periodo30d, periodo60d]);

  // ── Calcular MTTR período anterior ──────────────────────────
  const mttrAnterior = useMemo(() => {
    if (execPeriodoAnterior.length === 0) return 0;
    const comTempo = execPeriodoAnterior.filter(e => e.tempo_execucao > 0);
    if (comTempo.length === 0) return 0;
    return comTempo.reduce((s, e) => s + e.tempo_execucao, 0) / comTempo.length / 60;
  }, [execPeriodoAnterior]);

  // ── Calcular MTBF período anterior ──────────────────────────
  const mtbfAnterior = useMemo(() => {
    const corretivas = osPeriodoAnterior.filter(os => os.tipo === 'CORRETIVA' && os.status === 'FECHADA');
    if (corretivas.length === 0) return 0;
    return (30 * 24) / corretivas.length; // horas do período / falhas
  }, [osPeriodoAnterior]);

  // ── KPIs com comparação ─────────────────────────────────────
  const kpis = useMemo((): KPIComparacao[] => {
    if (!indicadores) return [];
    const mttrAtual = indicadores.mttr;
    const mtbfAtual = indicadores.mtbf;
    const dispAtual = indicadores.disponibilidade;
    const backlogAtual = indicadores.backlogQuantidade;
    const backlogSemAtual = indicadores.backlogSemanas;
    const aderAtual = indicadores.aderenciaProgramacao;
    const custoAtual = indicadores.custoTotalMes;

    // Custo anterior
    const custoAnt = execPeriodoAnterior.reduce((s, e) =>
      s + (Number(e.custo_mao_obra) || 0) + (Number(e.custo_materiais) || 0) + (Number(e.custo_terceiros) || 0), 0);

    // Disponibilidade anterior
    const dispAnt = mtbfAnterior > 0 ? (mtbfAnterior / (mtbfAnterior + Math.max(mttrAnterior, 0.1))) * 100 : 100;

    const backlogAnt = osPeriodoAnterior.filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA').length;

    const buildKPI = (
      nome: string, sigla: string, atual: number, anterior: number, meta: number, unidade: string, formula: string,
      inverso = false // true = menor é melhor (MTTR, Backlog)
    ): KPIComparacao => {
      const variacao = calcVariacao(atual, anterior);
      const tendencia = tendenciaFromVariacao(variacao);
      let severidade: AlertaSeveridade = 'ok';
      if (inverso) {
        if (atual > meta * 1.5) severidade = 'critico';
        else if (atual > meta) severidade = 'alerta';
        else if (atual > meta * 0.8) severidade = 'atencao';
      } else {
        if (atual < meta * 0.7) severidade = 'critico';
        else if (atual < meta) severidade = 'alerta';
        else if (atual < meta * 1.1) severidade = 'atencao';
      }
      return { nome, sigla, valorAtual: Math.round(atual * 10) / 10, valorAnterior: Math.round(anterior * 10) / 10, meta, unidade, variacao: Math.round(variacao * 10) / 10, tendencia, severidade, formula };
    };

    return [
      buildKPI('Tempo Médio de Reparo', 'MTTR', mttrAtual, mttrAnterior, METAS.mttr, 'h', 'Σ(tempo reparo) / Σ(falhas)', true),
      buildKPI('Tempo Médio Entre Falhas', 'MTBF', mtbfAtual, mtbfAnterior, METAS.mtbf, 'h', 'Tempo operação / Nº falhas', false),
      buildKPI('Disponibilidade', 'DISP', dispAtual, dispAnt, METAS.disponibilidade, '%', 'MTBF / (MTBF + MTTR) × 100', false),
      buildKPI('Backlog', 'BKL', backlogAtual, backlogAnt, METAS.backlogMax, 'OS', 'OS abertas + em andamento', true),
      buildKPI('Backlog em Semanas', 'BKS', backlogSemAtual, 0, METAS.backlogSemanasMax, 'sem', 'Σ(horas estimadas) / 40h', true),
      buildKPI('Aderência Preventiva', 'ADER', aderAtual, 0, METAS.aderenciaMin, '%', 'Preventivas no prazo / Total × 100', false),
      buildKPI('Custo Mensal', 'CUSTO', custoAtual, custoAnt, METAS.custoMensalMax, 'R$', 'Σ(MO + Material + Terceiros)', true),
    ];
  }, [indicadores, mttrAnterior, mtbfAnterior, execPeriodoAnterior, osPeriodoAnterior]);

  // ── Alertas Automáticos ─────────────────────────────────────
  const alertas = useMemo((): AlertaInteligente[] => {
    if (!indicadores) return [];
    const list: AlertaInteligente[] = [];

    // MTTR
    if (indicadores.mttr > METAS.mttr) {
      const var_ = calcVariacao(indicadores.mttr, mttrAnterior);
      list.push({
        id: 'mttr-alto',
        severidade: indicadores.mttr > METAS.mttr * 1.5 ? 'critico' : 'alerta',
        titulo: 'MTTR acima da meta',
        descricao: `O tempo médio de reparo está em ${indicadores.mttr.toFixed(1)}h (meta: ${METAS.mttr}h).${var_ > 10 ? ` Aumento de ${var_.toFixed(0)}% em relação ao período anterior.` : ''}`,
        metrica: 'MTTR',
        valorAtual: indicadores.mttr.toFixed(1),
        valorMeta: METAS.mttr,
        valorAnterior: mttrAnterior.toFixed(1),
        variacao: var_,
        acaoRecomendada: 'Investigar atrasos no início das OS e verificar disponibilidade de peças no estoque.',
        categoria: 'kpi',
      });
    }

    // Backlog
    if (indicadores.backlogQuantidade > METAS.backlogMax) {
      list.push({
        id: 'backlog-alto',
        severidade: indicadores.backlogQuantidade > METAS.backlogMax * 2 ? 'critico' : 'alerta',
        titulo: 'Backlog acima do limite',
        descricao: `${indicadores.backlogQuantidade} OS pendentes (máximo recomendado: ${METAS.backlogMax}). Risco de acúmulo e falhas futuras.`,
        metrica: 'Backlog',
        valorAtual: indicadores.backlogQuantidade,
        valorMeta: METAS.backlogMax,
        acaoRecomendada: 'Priorizar execução das OS urgentes e redistribuir carga entre técnicos.',
        categoria: 'backlog',
      });
    }

    // Disponibilidade
    if (indicadores.disponibilidade < METAS.disponibilidade) {
      list.push({
        id: 'disponibilidade-baixa',
        severidade: indicadores.disponibilidade < METAS.disponibilidade * 0.9 ? 'critico' : 'alerta',
        titulo: 'Disponibilidade abaixo da meta',
        descricao: `Disponibilidade em ${indicadores.disponibilidade.toFixed(1)}% (meta: ${METAS.disponibilidade}%).`,
        metrica: 'Disponibilidade',
        valorAtual: `${indicadores.disponibilidade.toFixed(1)}%`,
        valorMeta: `${METAS.disponibilidade}%`,
        acaoRecomendada: 'Identificar equipamentos com maior downtime e revisar planos de manutenção.',
        categoria: 'kpi',
      });
    }

    // Aderência Preventiva
    if (indicadores.aderenciaProgramacao < METAS.aderenciaMin) {
      list.push({
        id: 'aderencia-baixa',
        severidade: indicadores.aderenciaProgramacao < 70 ? 'critico' : 'alerta',
        titulo: 'Aderência preventiva abaixo do mínimo',
        descricao: `Apenas ${indicadores.aderenciaProgramacao.toFixed(1)}% das preventivas executadas no prazo. Baixa aderência está gerando aumento de corretivas.`,
        metrica: 'Aderência',
        valorAtual: `${indicadores.aderenciaProgramacao.toFixed(1)}%`,
        valorMeta: `${METAS.aderenciaMin}%`,
        acaoRecomendada: 'Revisar agenda preventiva e garantir que os planos estejam com recursos alocados.',
        categoria: 'preventiva',
      });
    }

    // Custo
    if (indicadores.custoTotalMes > METAS.custoMensalMax) {
      list.push({
        id: 'custo-alto',
        severidade: indicadores.custoTotalMes > METAS.custoMensalMax * 1.3 ? 'critico' : 'alerta',
        titulo: 'Custo mensal acima do orçamento',
        descricao: `Custo total de R$ ${indicadores.custoTotalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (orçamento: R$ ${METAS.custoMensalMax.toLocaleString('pt-BR')}).`,
        metrica: 'Custo',
        valorAtual: indicadores.custoTotalMes,
        valorMeta: METAS.custoMensalMax,
        acaoRecomendada: 'Analisar os equipamentos com maior custo e avaliar viabilidade de substituição.',
        categoria: 'custo',
      });
    }

    // Equipamentos com falhas repetidas
    if (ordensServico) {
      const contagem: Record<string, { tag: string; equip: string; falhas: number }> = {};
      osPeriodoAtual
        .filter(os => os.tipo === 'CORRETIVA')
        .forEach(os => {
          if (!contagem[os.tag]) contagem[os.tag] = { tag: os.tag, equip: os.equipamento, falhas: 0 };
          contagem[os.tag].falhas++;
        });
      Object.values(contagem)
        .filter(e => e.falhas >= 3)
        .sort((a, b) => b.falhas - a.falhas)
        .slice(0, 3)
        .forEach(e => {
          list.push({
            id: `equip-recorrente-${e.tag}`,
            severidade: e.falhas >= 5 ? 'critico' : 'alerta',
            titulo: `Falhas recorrentes: ${e.tag}`,
            descricao: `Equipamento ${e.equip} (${e.tag}) apresentou ${e.falhas} corretivas nos últimos 30 dias.`,
            metrica: 'Falhas',
            valorAtual: e.falhas,
            acaoRecomendada: `Analisar causa raiz das falhas em ${e.tag} e considerar revisão no plano preventivo.`,
            categoria: 'equipamento',
          });
        });
    }

    return list.sort((a, b) => {
      const ordem: Record<AlertaSeveridade, number> = { critico: 0, alerta: 1, atencao: 2, ok: 3 };
      return ordem[a.severidade] - ordem[b.severidade];
    });
  }, [indicadores, mttrAnterior, ordensServico, osPeriodoAtual]);

  // ── Insights Automáticos (Diagnósticos) ─────────────────────
  const insights = useMemo((): InsightAutomatico[] => {
    if (!indicadores || !ordensServico) return [];
    const list: InsightAutomatico[] = [];

    // Diagnóstico MTTR
    if (indicadores.mttr > METAS.mttr) {
      const varMttr = calcVariacao(indicadores.mttr, mttrAnterior);
      if (varMttr > 20) {
        list.push({
          id: 'insight-mttr-piora',
          tipo: 'diagnostico',
          texto: `O tempo médio de reparo aumentou ${varMttr.toFixed(0)}%, indicando possível ineficiência na execução ou atraso no atendimento das ordens de serviço.`,
          severidade: 'critico',
        });
      }
    }

    // Diagnóstico Preventiva → Corretiva
    const prevAtual = osPeriodoAtual.filter(os => os.tipo === 'PREVENTIVA').length;
    const corrAtual = osPeriodoAtual.filter(os => os.tipo === 'CORRETIVA').length;
    const prevAnt = osPeriodoAnterior.filter(os => os.tipo === 'PREVENTIVA').length;
    const corrAnt = osPeriodoAnterior.filter(os => os.tipo === 'CORRETIVA').length;

    if (corrAtual > corrAnt && prevAtual < prevAnt) {
      list.push({
        id: 'insight-prev-corr',
        tipo: 'causa',
        texto: `Redução de preventivas (${prevAnt} → ${prevAtual}) coincide com aumento de corretivas (${corrAnt} → ${corrAtual}). Baixa aderência preventiva está gerando mais falhas.`,
        severidade: 'alerta',
      });
    }

    // Diagnóstico de custo por equipamento
    if (ordensServico && execucoes) {
      const custoTag: Record<string, number> = {};
      let custoGlobal = 0;
      execucoes.forEach(ex => {
        const custo = (Number(ex.custo_mao_obra) || 0) + (Number(ex.custo_materiais) || 0) + (Number(ex.custo_terceiros) || 0);
        custoGlobal += custo;
      });

      // Mapear execução -> OS -> TAG
      const osMap = new Map(ordensServico.map(os => [os.id, os]));
      execucoes.forEach(ex => {
        const os = osMap.get(ex.os_id);
        if (!os) return;
        const custo = (Number(ex.custo_mao_obra) || 0) + (Number(ex.custo_materiais) || 0) + (Number(ex.custo_terceiros) || 0);
        custoTag[os.tag] = (custoTag[os.tag] || 0) + custo;
      });

      const top = Object.entries(custoTag).sort((a, b) => b[1] - a[1])[0];
      if (top && custoGlobal > 0) {
        const pct = (top[1] / custoGlobal) * 100;
        if (pct > 25) {
          list.push({
            id: 'insight-custo-concentrado',
            tipo: 'diagnostico',
            texto: `Equipamento ${top[0]} representa ${pct.toFixed(0)}% do custo total de manutenção. Avaliar viabilidade de substituição ou overhaul.`,
            severidade: pct > 40 ? 'critico' : 'alerta',
          });
        }
      }
    }

    // Tendência Backlog
    if (indicadores.backlogQuantidade > METAS.backlogMax) {
      const backlogAnt = osPeriodoAnterior.filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA').length;
      if (indicadores.backlogQuantidade > backlogAnt) {
        list.push({
          id: 'insight-backlog-crescente',
          tipo: 'tendencia',
          texto: `O backlog está crescendo (${backlogAnt} → ${indicadores.backlogQuantidade} OS). A taxa de abertura de OS excede a capacidade de execução.`,
          severidade: 'alerta',
        });
      }
    }

    // Modos de falha
    const modosFalha: Record<string, number> = {};
    osPeriodoAtual.forEach(os => {
      if (os.modo_falha) {
        modosFalha[os.modo_falha] = (modosFalha[os.modo_falha] || 0) + 1;
      }
    });
    const topModo = Object.entries(modosFalha).sort((a, b) => b[1] - a[1])[0];
    if (topModo && osPeriodoAtual.length > 0) {
      const pctModo = (topModo[1] / osPeriodoAtual.filter(os => os.modo_falha).length) * 100;
      if (pctModo > 30) {
        const nomeModo = topModo[0].replace(/_/g, ' ').toLowerCase();
        list.push({
          id: 'insight-modo-falha',
          tipo: 'causa',
          texto: `${pctModo.toFixed(0)}% das falhas registradas são por ${nomeModo}. Recomendado ação preventiva direcionada.`,
          severidade: 'atencao',
        });
      }
    }

    // Recomendações
    if (alertas.length > 0) {
      const criticos = alertas.filter(a => a.severidade === 'critico').length;
      if (criticos >= 2) {
        list.push({
          id: 'insight-acao-urgente',
          tipo: 'recomendacao',
          texto: `${criticos} indicadores em estado crítico. Recomendado reunião de emergência com a equipe de manutenção para definir prioridades.`,
          severidade: 'critico',
        });
      }
    }

    return list;
  }, [indicadores, ordensServico, execucoes, osPeriodoAtual, osPeriodoAnterior, mttrAnterior, alertas]);

  // ── Backlog Aging (Envelhecimento) ──────────────────────────
  const backlogAging = useMemo((): BacklogBucket[] => {
    if (!ordensServico) return [];
    const backlogOS = ordensServico.filter(os =>
      os.status === 'ABERTA' || os.status === 'EM_ANDAMENTO' || os.status === 'AGUARDANDO_MATERIAL'
    );
    const total = backlogOS.length || 1;

    const buckets = { '0–7 dias': 0, '7–15 dias': 0, '15–30 dias': 0, '30+ dias': 0 };
    const cores = { '0–7 dias': '#22c55e', '7–15 dias': '#eab308', '15–30 dias': '#f97316', '30+ dias': '#ef4444' };

    backlogOS.forEach(os => {
      const d = parseDateSafe(os.data_solicitacao);
      if (!d) return;
      const dias = differenceInDays(now, d);
      if (dias <= 7) buckets['0–7 dias']++;
      else if (dias <= 15) buckets['7–15 dias']++;
      else if (dias <= 30) buckets['15–30 dias']++;
      else buckets['30+ dias']++;
    });

    return Object.entries(buckets).map(([faixa, quantidade]) => ({
      faixa,
      quantidade,
      percentual: Math.round((quantidade / total) * 100),
      cor: cores[faixa as keyof typeof cores],
    }));
  }, [ordensServico, now]);

  // ── Top Equipamentos por Custo ──────────────────────────────
  const topEquipamentosCusto = useMemo((): TopEquipamentoCusto[] => {
    if (!ordensServico || !execucoes) return [];

    const osMap = new Map(ordensServico.map(os => [os.id, os]));
    const tagData: Record<string, TopEquipamentoCusto> = {};
    let custoGlobal = 0;

    execucoes.forEach(ex => {
      const os = osMap.get(ex.os_id);
      if (!os) return;
      const custo = (Number(ex.custo_mao_obra) || 0) + (Number(ex.custo_materiais) || 0) + (Number(ex.custo_terceiros) || 0);
      custoGlobal += custo;

      if (!tagData[os.tag]) {
        tagData[os.tag] = { tag: os.tag, equipamento: os.equipamento, custoTotal: 0, percentualTotal: 0, totalOS: 0, corretivas: 0, mtbfEquip: 0 };
      }
      tagData[os.tag].custoTotal += custo;
    });

    // Contar OS por tag
    ordensServico.forEach(os => {
      if (tagData[os.tag]) {
        tagData[os.tag].totalOS++;
        if (os.tipo === 'CORRETIVA') tagData[os.tag].corretivas++;
      }
    });

    return Object.values(tagData)
      .map(e => ({ ...e, percentualTotal: custoGlobal > 0 ? Math.round((e.custoTotal / custoGlobal) * 100) : 0 }))
      .sort((a, b) => b.custoTotal - a.custoTotal)
      .slice(0, 10);
  }, [ordensServico, execucoes]);

  // ── Produtividade dos Mecânicos ─────────────────────────────
  const mecanicosDesempenho = useMemo((): MecanicoDesempenho[] => {
    if (!execucoes) return [];
    const mecData: Record<string, MecanicoDesempenho> = {};

    execucoes.forEach(ex => {
      const nome = ex.mecanico_nome || 'Não identificado';
      if (!mecData[nome]) mecData[nome] = { nome, osExecutadas: 0, horasTrabalhadas: 0, tempoMedioPorOS: 0, eficiencia: 0 };
      mecData[nome].osExecutadas++;
      mecData[nome].horasTrabalhadas += (ex.tempo_execucao || 0) / 60;
    });

    const horasDisponiveis = 176; // 22 dias × 8h
    return Object.values(mecData)
      .map(m => ({
        ...m,
        horasTrabalhadas: Math.round(m.horasTrabalhadas * 10) / 10,
        tempoMedioPorOS: m.osExecutadas > 0 ? Math.round((m.horasTrabalhadas / m.osExecutadas) * 10) / 10 : 0,
        eficiencia: Math.min(Math.round((m.horasTrabalhadas / horasDisponiveis) * 100), 100),
      }))
      .sort((a, b) => b.osExecutadas - a.osExecutadas);
  }, [execucoes]);

  // ── Aderência Preventiva Detalhada ──────────────────────────
  const aderenciaDetalhada = useMemo((): AderenciaDetalhada => {
    if (!ordensServico) return { executadasNoPrazo: 0, executadasAtrasadas: 0, naoExecutadas: 0, total: 0, percentualNoPrazo: 0, percentualAtrasadas: 0, percentualNaoExecutadas: 0 };

    const preventivas = ordensServico.filter(os => os.tipo === 'PREVENTIVA');
    const total = preventivas.length || 1;

    const noPrazo = preventivas.filter(os => {
      if (os.status !== 'FECHADA' || !os.data_fechamento || !os.created_at) return false;
      const abertura = new Date(os.created_at);
      const fechamento = new Date(os.data_fechamento);
      const prazoHoras = Math.max(24, (os.tempo_estimado || 0) / 60);
      return differenceInHours(fechamento, abertura) <= prazoHoras;
    }).length;

    const atrasadas = preventivas.filter(os => {
      if (os.status !== 'FECHADA' || !os.data_fechamento || !os.created_at) return false;
      const abertura = new Date(os.created_at);
      const fechamento = new Date(os.data_fechamento);
      const prazoHoras = Math.max(24, (os.tempo_estimado || 0) / 60);
      return differenceInHours(fechamento, abertura) > prazoHoras;
    }).length;

    const naoExecutadas = preventivas.filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA').length;

    return {
      executadasNoPrazo: noPrazo,
      executadasAtrasadas: atrasadas,
      naoExecutadas,
      total: preventivas.length,
      percentualNoPrazo: Math.round((noPrazo / total) * 100),
      percentualAtrasadas: Math.round((atrasadas / total) * 100),
      percentualNaoExecutadas: Math.round((naoExecutadas / total) * 100),
    };
  }, [ordensServico]);

  // ── OS por dia (para gráfico de tendência) ──────────────────
  const osPorDia = useMemo(() => {
    if (!ordensServico) return [];
    const dias: Record<string, { data: string; abertas: number; fechadas: number; corretivas: number; preventivas: number }> = {};

    // Últimos 30 dias
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), 'yyyy-MM-dd');
      dias[d] = { data: d, abertas: 0, fechadas: 0, corretivas: 0, preventivas: 0 };
    }

    ordensServico.forEach(os => {
      const dSol = os.data_solicitacao?.slice(0, 10);
      if (dSol && dias[dSol]) {
        dias[dSol].abertas++;
        if (os.tipo === 'CORRETIVA') dias[dSol].corretivas++;
        if (os.tipo === 'PREVENTIVA') dias[dSol].preventivas++;
      }
      if (os.data_fechamento) {
        const dFech = os.data_fechamento.slice(0, 10);
        if (dias[dFech]) dias[dFech].fechadas++;
      }
    });

    return Object.values(dias);
  }, [ordensServico, now]);

  // ── Resumo executivo (dados + contexto) ─────────────────────
  const resumoExecutivo = useMemo(() => {
    if (!indicadores || !ordensServico) return null;
    const totalOS = ordensServico.length;
    const corretivas = ordensServico.filter(os => os.tipo === 'CORRETIVA').length;
    const preventivas = ordensServico.filter(os => os.tipo === 'PREVENTIVA').length;
    const pctPrev = totalOS > 0 ? Math.round((preventivas / totalOS) * 100) : 0;
    const pctCorr = totalOS > 0 ? Math.round((corretivas / totalOS) * 100) : 0;

    return {
      totalOS,
      corretivas,
      preventivas,
      pctPreventiva: pctPrev,
      pctCorretiva: pctCorr,
      mttr: indicadores.mttr,
      mtbf: indicadores.mtbf,
      disponibilidade: indicadores.disponibilidade,
      backlogQtd: indicadores.backlogQuantidade,
      backlogDias: Math.round(indicadores.backlogTempo / 8), // 8h work day
      custoTotal: indicadores.custoTotalMes,
      totalAlertas: alertas.length,
      alertasCriticos: alertas.filter(a => a.severidade === 'critico').length,
    };
  }, [indicadores, ordensServico, alertas]);

  return {
    kpis,
    alertas,
    insights,
    backlogAging,
    topEquipamentosCusto,
    mecanicosDesempenho,
    aderenciaDetalhada,
    osPorDia,
    resumoExecutivo,
    ordensServico,
    indicadores,
    isLoading: loadingOS || loadingExec || loadingInd,
  };
}
