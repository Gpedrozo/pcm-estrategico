import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import type { PlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import type { AtividadePreventiva } from '@/hooks/useAtividadesPreventivas';
import {
  DocumentPrintBase,
  PrintInfoGrid,
  PrintSectionHeader,
  PrintBlankLines,
  PrintTimeRow,
  PrintStatusCheckboxes,
  PrintExecutorBlock,
} from '@/components/print/DocumentPrintBase';

interface PreventivaData {
  plano: PlanoPreventivo;
  atividades: AtividadePreventiva[];
  tempoTotal: number;
}

interface PreventivaPrintTemplateProps {
  data: PreventivaData;
  empresa?: DadosEmpresa | null;
  documentNumber?: string;
  layoutVersion?: string;
}

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const PreventivaPrintTemplate = forwardRef<HTMLDivElement, PreventivaPrintTemplateProps>(
  ({ data, empresa, documentNumber, layoutVersion }, ref) => {
    const { plano, atividades, tempoTotal } = data;
    const docNum = documentNumber || `PR-${plano.codigo}`;
    const proximaExec = plano.proxima_execucao
      ? format(new Date(plano.proxima_execucao), 'dd/MM/yyyy', { locale: ptBR })
      : 'N/A';

    const tipoGatilho: Record<string, string> = {
      TEMPO: 'Tempo', CICLO: 'Ciclo', CONDICAO: 'Condição',
    };

    return (
      <DocumentPrintBase
        ref={ref}
        title="PLANO DE MANUTENÇÃO PREVENTIVA"
        documentNumber={docNum}
        empresa={empresa}
        layoutVersion={layoutVersion}
      >
        {/* ═══ PLAN INFO ═══ */}
        <PrintInfoGrid items={[
          { label: 'TAG / MÁQUINA', value: plano.tag || 'N/A', mono: true },
          { label: 'TIPO GATILHO', value: tipoGatilho[plano.tipo_gatilho] || plano.tipo_gatilho },
          { label: 'FREQUÊNCIA', value: `${plano.frequencia_dias} dias` },
          { label: 'PRÓXIMA EXECUÇÃO', value: proximaExec },
        ]} />

        {/* ═══ PLAN NAME ═══ */}
        <div className="border-b-2 border-black p-2 text-[9px]">
          <span className="font-bold text-gray-500 text-[8px]">PLANO: </span>
          <span className="font-semibold">{plano.nome.toUpperCase()}</span>
          {(plano as any).responsavel_nome && (
            <span className="ml-4 text-gray-500">Responsável: {(plano as any).responsavel_nome}</span>
          )}
        </div>

        {/* ═══ DESCRIPTION ═══ */}
        {plano.descricao && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="DESCRIÇÃO" />
            <div className="p-2 min-h-[10mm] text-[9px]">{plano.descricao}</div>
          </div>
        )}

        {/* ═══ ACTIVITIES TABLE ═══ */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider flex justify-between">
            <span>ATIVIDADES E SERVIÇOS</span>
            <span>TEMPO TOTAL: {formatMin(tempoTotal)}</span>
          </div>

          {atividades.map((atv, aIdx) => (
            <div key={atv.id}>
              <div className="flex border-b border-black bg-gray-50">
                <div className="w-[8mm] border-r border-black p-1.5 text-center font-black text-[9px]">{aIdx + 1}</div>
                <div className="flex-1 p-1.5 text-[9px]">
                  <span className="font-bold">{atv.nome.toUpperCase()}</span>
                  {atv.responsavel && <span className="ml-3 text-gray-500 text-[8px]">Resp: {atv.responsavel}</span>}
                </div>
                <div className="w-[20mm] border-l border-black p-1.5 text-center text-[9px] font-bold font-mono">{formatMin(atv.tempo_total_min)}</div>
              </div>

              {(atv.servicos || []).length > 0 && (
                <div className="flex border-b border-black text-[8px] font-bold text-gray-500">
                  <div className="w-[8mm] border-r border-black p-1 text-center">#</div>
                  <div className="flex-1 p-1 pl-3">SERVIÇO</div>
                  <div className="w-[18mm] border-l border-black p-1 text-center">TEMPO</div>
                  <div className="w-[14mm] border-l border-black p-1 text-center">OK</div>
                </div>
              )}

              {(atv.servicos || []).map((srv, sIdx) => (
                <div key={srv.id} className="flex border-b border-black text-[9px]">
                  <div className="w-[8mm] border-r border-black p-1 text-center text-gray-400 text-[8px]">{aIdx + 1}.{sIdx + 1}</div>
                  <div className="flex-1 p-1 pl-3">{srv.descricao}</div>
                  <div className="w-[18mm] border-l border-black p-1 text-center font-mono text-[8px]">{formatMin(srv.tempo_estimado_min)}</div>
                  <div className="w-[14mm] border-l border-black p-1 flex items-center justify-center">
                    <span className="inline-block w-3.5 h-3.5 border border-black"></span>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {atividades.length === 0 && (
            <div className="p-3 text-center text-[9px] text-gray-400">Nenhuma atividade cadastrada</div>
          )}
        </div>

        {/* ═══ EXECUTOR ═══ */}
        <PrintExecutorBlock count={2} label="EXECUTOR" />

        {/* ═══ TIME ═══ */}
        <PrintTimeRow />

        {/* ═══ INSTRUCTIONS ═══ */}
        {plano.instrucoes && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="INSTRUÇÕES DE EXECUÇÃO" />
            <div className="p-2 min-h-[12mm] text-[9px] whitespace-pre-wrap">{plano.instrucoes}</div>
          </div>
        )}

        {/* ═══ MATERIALS ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="PEÇAS / MATERIAIS UTILIZADOS" />
          <PrintBlankLines count={3} />
        </div>

        {/* ═══ STATUS ═══ */}
        <PrintStatusCheckboxes />

        {/* ═══ OBSERVATIONS ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="OBSERVAÇÕES" />
          <PrintBlankLines count={2} />
        </div>
      </DocumentPrintBase>
    );
  }
);

PreventivaPrintTemplate.displayName = 'PreventivaPrintTemplate';
