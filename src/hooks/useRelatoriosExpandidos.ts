/**
 * useRelatoriosExpandidos — Hook de dados para os novos 15 relatórios.
 * Agrega hooks existentes em um único ponto de acesso para a página de Relatórios.
 */
import { useMemo } from 'react';
import { useOrdensServico } from './useOrdensServico';
import { useExecucoesOS } from './useExecucoesOS';
import { useSolicitacoes } from './useSolicitacoes';
import { useMateriais, useMovimentacoes as useMovimentacoesMat } from './useMateriais';
import { useFMEA } from './useFMEA';
import { useMedicoesPreditivas } from './useMedicoesPreditivas';
import { useRCAs } from './useRCA';
import { useTreinamentosSSMA } from './useTreinamentosSSMA';
import { useContratos } from './useContratos';
import { useLubrificantes } from './useEstoqueLubrificantes';
import { usePlanosLubrificacao } from './useLubrificacao';

export function useRelatoriosExpandidos(_dateFrom: string, _dateTo: string) {
  // ── Core OS & Execuções ──────────────────────────────────────
  const { data: ordensServico = [], isLoading: loadingOS } = useOrdensServico();
  const { data: execucoes = [], isLoading: loadingExec } = useExecucoesOS();

  // ── Solicitações ─────────────────────────────────────────────
  const { data: solicitacoesRaw, isLoading: loadingSolic } = useSolicitacoes();
  const solicitacoes = useMemo(() => (Array.isArray(solicitacoesRaw) ? solicitacoesRaw : []), [solicitacoesRaw]);

  // ── Materiais & Movimentações ─────────────────────────────────
  const { data: materiais = [], isLoading: loadingMat } = useMateriais();
  const { data: movimentacoesMat = [], isLoading: loadingMov } = useMovimentacoesMat(undefined);

  // ── FMEA ──────────────────────────────────────────────────────
  const { data: fmeas = [], isLoading: loadingFMEA } = useFMEA();

  // ── Medições Preditivas ───────────────────────────────────────
  const { data: medicoes = [], isLoading: loadingMedicoes } = useMedicoesPreditivas();

  // ── RCA ───────────────────────────────────────────────────────
  const { data: rcas = [], isLoading: loadingRCA } = useRCAs();

  // ── Treinamentos SSMA ─────────────────────────────────────────
  const { data: treinamentos = [], isLoading: loadingSSMA } = useTreinamentosSSMA();

  // ── Contratos ───────────────────────────────────────────────
  const { data: contratos = [], isLoading: loadingContratos } = useContratos();

  // ── Lubrificação ──────────────────────────────────────────────
  const { data: lubrificantes = [], isLoading: loadingLubr } = useLubrificantes();
  const { data: planosLubrif = [], isLoading: loadingPlanos } = usePlanosLubrificacao();

  const isLoading =
    loadingOS || loadingExec || loadingSolic ||
    loadingMat || loadingMov || loadingFMEA ||
    loadingMedicoes || loadingRCA || loadingSSMA ||
    loadingContratos || loadingLubr || loadingPlanos;

  return {
    // Core
    ordensServico,
    execucoes,
    // Novos
    solicitacoes,
    materiais,
    movimentacoesMat,
    fmeas,
    medicoes,
    rcas,
    treinamentos,
    contratos,
    lubrificantes,
    planosLubrif,
    // Estado
    isLoading,
  };
}
