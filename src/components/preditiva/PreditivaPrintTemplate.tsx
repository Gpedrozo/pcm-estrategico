import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import type { MedicaoPreditivaRow } from '@/hooks/useMedicoesPreditivas';
import {
  DocumentPrintBase,
  PrintInfoGrid,
  PrintSectionHeader,
  PrintBlankLines,
  PrintTimeRow,
  PrintStatusCheckboxes,
  PrintExecutorBlock,
} from '@/components/print/DocumentPrintBase';

interface PreditivaPrintTemplateProps {
  medicoes: MedicaoPreditivaRow[];
  tag: string;
  empresa?: DadosEmpresa | null;
}

export const PreditivaPrintTemplate = forwardRef<HTMLDivElement, PreditivaPrintTemplateProps>(
  ({ medicoes, tag, empresa }, ref) => {
    const docNum = `PRD-${tag.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()}`;
    const dataEmissao = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });

    const tipos = [...new Set(medicoes.map(m => m.tipo_medicao))].join(', ');
    const responsavel = medicoes.find(m => m.responsavel_nome)?.responsavel_nome || '—';

    const alertas = medicoes.filter(m =>
      m.status && ['ALERTA', 'CRITICO'].includes(m.status.toUpperCase())
    ).length;

    return (
      <DocumentPrintBase
        ref={ref}
        title="RELATÓRIO DE MEDIÇÃO PREDITIVA"
        documentNumber={docNum}
        empresa={empresa}
      >
        {/* ═══ EQUIPMENT INFO ═══ */}
        <PrintInfoGrid items={[
          { label: 'TAG / MÁQUINA', value: tag, mono: true },
          { label: 'TIPOS DE MEDIÇÃO', value: tipos || '—' },
          { label: 'TOTAL DE MEDIÇÕES', value: String(medicoes.length) },
          { label: 'ALERTAS', value: String(alertas) },
        ]} />

        <PrintInfoGrid items={[
          { label: 'RESPONSÁVEL', value: responsavel },
          { label: 'DATA EMISSÃO', value: dataEmissao },
        ]} />

        {/* ═══ MEASUREMENTS TABLE ═══ */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">
            MEDIÇÕES / LEITURAS PREDITIVAS
          </div>

          <div className="flex border-b border-black text-[8px] font-bold text-gray-500">
            <div className="w-[8mm] border-r border-black p-1 text-center">#</div>
            <div className="flex-1 p-1 pl-3">TIPO / PARÂMETRO</div>
            <div className="w-[18mm] border-l border-black p-1 text-center">UNID.</div>
            <div className="w-[20mm] border-l border-black p-1 text-center">VALOR</div>
            <div className="w-[20mm] border-l border-black p-1 text-center">LIM. ALERTA</div>
            <div className="w-[20mm] border-l border-black p-1 text-center">LIM. CRÍTICO</div>
            <div className="w-[16mm] border-l border-black p-1 text-center">STATUS</div>
            <div className="w-[22mm] border-l border-black p-1 text-center">DATA</div>
          </div>

          {medicoes.map((med, idx) => {
            const statusColor = med.status === 'CRITICO'
              ? 'font-bold text-red-700'
              : med.status === 'ALERTA'
                ? 'font-bold text-yellow-700'
                : '';
            return (
              <div key={med.id} className="flex border-b border-black text-[9px]">
                <div className="w-[8mm] border-r border-black p-1 text-center text-gray-400 text-[8px]">{idx + 1}</div>
                <div className="flex-1 p-1 pl-3">{med.tipo_medicao}</div>
                <div className="w-[18mm] border-l border-black p-1 text-center">{med.unidade || '—'}</div>
                <div className="w-[20mm] border-l border-black p-1 text-center font-mono font-bold">{med.valor}</div>
                <div className="w-[20mm] border-l border-black p-1 text-center">{med.limite_alerta ?? '—'}</div>
                <div className="w-[20mm] border-l border-black p-1 text-center">{med.limite_critico ?? '—'}</div>
                <div className={`w-[16mm] border-l border-black p-1 text-center text-[8px] ${statusColor}`}>{med.status || 'NORMAL'}</div>
                <div className="w-[22mm] border-l border-black p-1 text-center text-[8px]">
                  {format(new Date(med.created_at), 'dd/MM/yy', { locale: ptBR })}
                </div>
              </div>
            );
          })}

          {/* Empty rows for manual entries */}
          {Array.from({ length: Math.max(0, 6 - medicoes.length) }).map((_, i) => (
            <div key={`blank-${i}`} className="flex border-b border-black text-[9px]">
              <div className="w-[8mm] border-r border-black p-1 text-center text-gray-400 text-[8px]">{medicoes.length + i + 1}</div>
              <div className="flex-1 p-1 pl-3 min-h-[6mm]"></div>
              <div className="w-[18mm] border-l border-black p-1"></div>
              <div className="w-[20mm] border-l border-black p-1"></div>
              <div className="w-[20mm] border-l border-black p-1"></div>
              <div className="w-[20mm] border-l border-black p-1"></div>
              <div className="w-[16mm] border-l border-black p-1"></div>
              <div className="w-[22mm] border-l border-black p-1"></div>
            </div>
          ))}
        </div>

        {/* ═══ ANALYSIS ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="ANÁLISE / DIAGNÓSTICO PREDITIVO" />
          <PrintBlankLines count={4} />
        </div>

        {/* ═══ RECOMMENDED ACTIONS ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="AÇÕES RECOMENDADAS" />
          <div className="p-2">
            {['Continuar monitoramento normal', 'Programar manutenção preventiva', 'Intervenção imediata necessária', 'Encaminhar para análise especializada'].map((action, i) => (
              <div key={i} className="flex items-center gap-2 mb-1 text-[9px]">
                <span className="inline-block w-3.5 h-3.5 border border-black flex-shrink-0"></span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ EXECUTOR ═══ */}
        <PrintExecutorBlock count={2} label="TÉCNICO" />

        {/* ═══ TIME ═══ */}
        <PrintTimeRow />

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

PreditivaPrintTemplate.displayName = 'PreditivaPrintTemplate';
