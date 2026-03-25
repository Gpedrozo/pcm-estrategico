import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import type { InspecaoRow } from '@/hooks/useInspecoes';
import {
  DocumentPrintBase,
  PrintInfoGrid,
  PrintSectionHeader,
  PrintBlankLines,
  PrintTimeRow,
  PrintStatusCheckboxes,
  PrintExecutorBlock,
} from '@/components/print/DocumentPrintBase';

interface InspecaoPrintTemplateProps {
  inspecao: InspecaoRow;
  empresa?: DadosEmpresa | null;
}

const statusLabels: Record<string, string> = {
  PLANEJADA: 'PLANEJADA',
  EM_ANDAMENTO: 'EM ANDAMENTO',
  CONCLUIDA: 'CONCLUÍDA',
  CANCELADA: 'CANCELADA',
};

export const InspecaoPrintTemplate = forwardRef<HTMLDivElement, InspecaoPrintTemplateProps>(
  ({ inspecao, empresa }, ref) => {
    const docNum = `INS-${(inspecao.id || '').substring(0, 8).toUpperCase()}`;
    const dataInspecao = format(new Date(inspecao.data_inspecao), 'dd/MM/yyyy', { locale: ptBR });

    const checklist: Array<{ item: string; resposta: string; criticidade?: string }> =
      Array.isArray(inspecao.itens_inspecionados) ? inspecao.itens_inspecionados : [];

    return (
      <DocumentPrintBase
        ref={ref}
        title="FICHA DE INSPEÇÃO"
        documentNumber={docNum}
        empresa={empresa}
      >
        {/* ═══ INSPECTION INFO ═══ */}
        <PrintInfoGrid items={[
          { label: 'ROTA / INSPEÇÃO', value: inspecao.rota_nome || '—' },
          { label: 'STATUS', value: statusLabels[inspecao.status] || inspecao.status },
          { label: 'DATA', value: dataInspecao },
          { label: 'TURNO', value: inspecao.turno || '—' },
        ]} />

        <PrintInfoGrid items={[
          { label: 'INSPETOR', value: inspecao.inspetor_nome || '—' },
          { label: 'HORA INÍCIO', value: inspecao.hora_inicio || '___:___' },
          { label: 'HORA FIM', value: inspecao.hora_fim || '___:___' },
        ]} />

        {/* ═══ DESCRIPTION ═══ */}
        {inspecao.descricao && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="DESCRIÇÃO / OBJETIVO" />
            <div className="p-2 min-h-[10mm] text-[9px]">{inspecao.descricao}</div>
          </div>
        )}

        {/* ═══ CHECKLIST TABLE ═══ */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider flex justify-between">
            <span>CHECKLIST DE INSPEÇÃO</span>
            <span>ANOMALIAS: {inspecao.anomalias_encontradas || 0}</span>
          </div>

          {/* Header */}
          <div className="flex border-b border-black text-[8px] font-bold text-gray-500">
            <div className="w-[8mm] border-r border-black p-1 text-center">#</div>
            <div className="flex-1 p-1 pl-3">ITEM A INSPECIONAR</div>
            <div className="w-[16mm] border-l border-black p-1 text-center">CONFORME</div>
            <div className="w-[16mm] border-l border-black p-1 text-center">NÃO CONF.</div>
            <div className="w-[14mm] border-l border-black p-1 text-center">N/A</div>
            <div className="w-[14mm] border-l border-black p-1 text-center">CRIT.</div>
            <div className="w-[40mm] border-l border-black p-1 text-center">OBSERVAÇÃO</div>
          </div>

          {/* Pre-filled items from checklist */}
          {checklist.map((item, idx) => (
            <div key={idx} className="flex border-b border-black text-[9px]">
              <div className="w-[8mm] border-r border-black p-1 text-center text-gray-400 text-[8px]">{idx + 1}</div>
              <div className="flex-1 p-1 pl-3">{item.item}</div>
              <div className="w-[16mm] border-l border-black p-1 flex items-center justify-center">
                <span className={`inline-block w-3.5 h-3.5 border border-black ${item.resposta === 'OK' ? 'bg-gray-400' : ''}`}></span>
              </div>
              <div className="w-[16mm] border-l border-black p-1 flex items-center justify-center">
                <span className={`inline-block w-3.5 h-3.5 border border-black ${item.resposta === 'NOK' ? 'bg-gray-400' : ''}`}></span>
              </div>
              <div className="w-[14mm] border-l border-black p-1 flex items-center justify-center">
                <span className={`inline-block w-3.5 h-3.5 border border-black ${item.resposta === 'NA' ? 'bg-gray-400' : ''}`}></span>
              </div>
              <div className="w-[14mm] border-l border-black p-1 text-center text-[7px]">
                {item.criticidade || '—'}
              </div>
              <div className="w-[40mm] border-l border-black p-1"></div>
            </div>
          ))}

          {/* Empty rows to fill up to at least 12 */}
          {Array.from({ length: Math.max(0, 12 - checklist.length) }).map((_, i) => (
            <div key={`blank-${i}`} className="flex border-b border-black text-[9px]">
              <div className="w-[8mm] border-r border-black p-1 text-center text-gray-400 text-[8px]">{checklist.length + i + 1}</div>
              <div className="flex-1 p-1 pl-3 min-h-[6mm]"></div>
              <div className="w-[16mm] border-l border-black p-1 flex items-center justify-center">
                <span className="inline-block w-3.5 h-3.5 border border-black"></span>
              </div>
              <div className="w-[16mm] border-l border-black p-1 flex items-center justify-center">
                <span className="inline-block w-3.5 h-3.5 border border-black"></span>
              </div>
              <div className="w-[14mm] border-l border-black p-1 flex items-center justify-center">
                <span className="inline-block w-3.5 h-3.5 border border-black"></span>
              </div>
              <div className="w-[14mm] border-l border-black p-1"></div>
              <div className="w-[40mm] border-l border-black p-1"></div>
            </div>
          ))}
        </div>

        {/* ═══ EXECUTOR ═══ */}
        <PrintExecutorBlock count={2} label="INSPETOR" />

        {/* ═══ TIME ═══ */}
        <PrintTimeRow />

        {/* ═══ STATUS ═══ */}
        <PrintStatusCheckboxes />

        {/* ═══ OBSERVATIONS ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="OBSERVAÇÕES / AÇÕES CORRETIVAS NECESSÁRIAS" />
          {inspecao.observacoes && (
            <div className="p-2 text-[9px] text-gray-600">{inspecao.observacoes}</div>
          )}
          <PrintBlankLines count={3} />
        </div>
      </DocumentPrintBase>
    );
  }
);

InspecaoPrintTemplate.displayName = 'InspecaoPrintTemplate';
