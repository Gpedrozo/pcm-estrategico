import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import {
  DocumentPrintBase,
  PrintInfoGrid,
  PrintSectionHeader,
  PrintBlankLines,
  PrintTimeRow,
  PrintStatusCheckboxes,
  PrintExecutorBlock,
} from '@/components/print/DocumentPrintBase';

interface OSPrintTemplateProps {
  os: {
    numero_os: number;
    data_solicitacao: string;
    tag: string;
    equipamento: string;
    problema: string;
    solicitante: string;
    tipo: string;
    prioridade: string;
    tempo_estimado?: number | null;
    custo_estimado?: number | null;
  };
  nomeEmpresa?: string;
  empresa?: DadosEmpresa | null;
  documentNumber?: string;
  layoutVersion?: string;
}

export const OSPrintTemplate = forwardRef<HTMLDivElement, OSPrintTemplateProps>(
  ({ os, empresa, documentNumber, layoutVersion }, ref) => {
    const dataSolicitacao = format(new Date(os.data_solicitacao), 'dd/MM/yyyy', { locale: ptBR });
    const docNum = documentNumber || `OS-${String(os.numero_os).padStart(6, '0')}`;

    const tipoLabels: Record<string, string> = {
      CORRETIVA: 'Corretiva', PREVENTIVA: 'Preventiva', PREDITIVA: 'Preditiva',
      INSPECAO: 'Inspeção', MELHORIA: 'Melhoria',
    };
    const prioridadeLabels: Record<string, string> = {
      URGENTE: 'Urgente', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa',
    };

    return (
      <DocumentPrintBase
        ref={ref}
        title="ORDEM DE SERVIÇO"
        documentNumber={docNum}
        empresa={empresa}
        layoutVersion={layoutVersion}
      >
        {/* ═══ OS INFO ═══ */}
        <PrintInfoGrid items={[
          { label: 'DATA SOLICITAÇÃO', value: dataSolicitacao },
          { label: 'SOLICITANTE', value: os.solicitante.toUpperCase() },
          { label: 'TAG', value: os.tag, mono: true },
          { label: 'TIPO / PRIORIDADE', value: `${tipoLabels[os.tipo] || os.tipo} — ${prioridadeLabels[os.prioridade] || os.prioridade}` },
        ]} />

        {/* ═══ EQUIPMENT ═══ */}
        <div className="border-b-2 border-black p-2 text-[9px]">
          <span className="font-bold text-gray-500 text-[8px]">EQUIPAMENTO: </span>
          <span className="font-semibold">{os.equipamento.toUpperCase()}</span>
        </div>

        {/* ═══ PROBLEM ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="PROBLEMA APRESENTADO" />
          <div className="p-3 min-h-[15mm] text-[10px]">{os.problema.toUpperCase()}</div>
        </div>

        {/* ═══ MAINTAINERS ═══ */}
        <PrintExecutorBlock count={2} label="MANUTENTOR" />

        {/* ═══ TIME ═══ */}
        <PrintTimeRow />

        {/* ═══ SERVICE ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="SERVIÇO EXECUTADO" />
          <PrintBlankLines count={5} />
        </div>

        {/* ═══ PARTS ═══ */}
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

OSPrintTemplate.displayName = 'OSPrintTemplate';
