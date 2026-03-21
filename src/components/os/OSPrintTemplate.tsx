import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import {
  DocumentPrintBase,
  PrintInfoGrid,
  PrintSectionHeader,
  PrintBlankLines,
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

        {/* ═══ EXECUTION TIME ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="DADOS DE FECHAMENTO DA EXECUÇÃO" />
          <div className="grid grid-cols-6 text-[9px]">
            {['DATA INÍCIO', 'HORA INÍCIO', 'DATA FINAL', 'HORA FINAL', 'HOUVE INTERVALOS?', 'TEMPO TOTAL'].map((label, i) => (
              <div key={label} className={`p-2 ${i < 5 ? 'border-r border-black' : ''}`}>
                <span className="font-bold text-gray-500 text-[8px]">{label}</span>
                <div className="h-5 mt-1 border-b border-dashed border-gray-400"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 border-t border-black text-[9px]">
            {['INTERVALO 1 (DATA/HORA INÍCIO)', 'INTERVALO 1 (DATA/HORA FIM)', 'INTERVALO 2 (DATA/HORA INÍCIO)', 'INTERVALO 2 (DATA/HORA FIM)'].map((label, i) => (
              <div key={label} className={`p-2 ${i < 3 ? 'border-r border-black' : ''}`}>
                <span className="font-bold text-gray-500 text-[8px]">{label}</span>
                <div className="h-5 mt-1 border-b border-dashed border-gray-400"></div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SERVICE ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="SERVIÇO EXECUTADO" />
          <div className="px-3 py-2 text-[8px] bg-amber-50 border-b border-black text-amber-900">
            <span className="font-bold">Atenção:</span> descrever obrigatoriamente o serviço executado com o máximo de detalhes possível, incluindo etapas realizadas, componentes atendidos, ajustes efetuados, medições/testes e condição final do equipamento.
          </div>
          <PrintBlankLines count={5} />
        </div>

        {/* ═══ PARTS ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="PEÇAS / MATERIAIS UTILIZADOS" />
          <div className="grid grid-cols-5 text-[8px] font-bold bg-gray-50 border-b border-black">
            <div className="p-1.5 border-r border-black">CÓDIGO</div>
            <div className="p-1.5 border-r border-black">DESCRIÇÃO</div>
            <div className="p-1.5 border-r border-black">QTD</div>
            <div className="p-1.5 border-r border-black">UN</div>
            <div className="p-1.5">OBS.</div>
          </div>
          <PrintBlankLines count={4} />
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
