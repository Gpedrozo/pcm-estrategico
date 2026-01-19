import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoEmpresa from '@/assets/logo-empresa.jpg';

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
}

export const OSPrintTemplate = forwardRef<HTMLDivElement, OSPrintTemplateProps>(
  ({ os, nomeEmpresa = "MANUTENÇÃO INDUSTRIAL" }, ref) => {
    const dataEmissao = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const dataSolicitacao = format(new Date(os.data_solicitacao), "dd/MM/yyyy", { locale: ptBR });

    const tipoLabels: Record<string, string> = {
      CORRETIVA: 'Corretiva',
      PREVENTIVA: 'Preventiva',
      PREDITIVA: 'Preditiva',
      INSPECAO: 'Inspeção',
      MELHORIA: 'Melhoria',
    };

    const prioridadeLabels: Record<string, string> = {
      URGENTE: 'Urgente',
      ALTA: 'Alta',
      MEDIA: 'Média',
      BAIXA: 'Baixa',
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 w-[210mm] min-h-[297mm] mx-auto print:p-4"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
      >
        {/* Header */}
        <div className="border-2 border-black">
          {/* Title Row */}
          <div className="flex border-b-2 border-black">
            <div className="w-24 border-r-2 border-black p-2 flex items-center justify-center">
              <img src={logoEmpresa} alt="Logo" className="h-16 w-auto object-contain" />
            </div>
            <div className="flex-1 text-center py-3">
              <h1 className="text-xl font-bold">Ordem de Serviços</h1>
            </div>
            <div className="w-48 border-l-2 border-black text-xs">
              <div className="grid grid-cols-2">
                <div className="border-b border-r border-black p-1">
                  <span className="font-bold">Data de Emissão:</span>
                </div>
                <div className="border-b border-black p-1">{dataEmissao}</div>
                <div className="border-b border-r border-black p-1">
                  <span className="font-bold">Data de Revisão:</span>
                </div>
                <div className="border-b border-black p-1">{dataEmissao}</div>
                <div className="border-b border-r border-black p-1">
                  <span className="font-bold">Nº:</span>
                </div>
                <div className="border-b border-black p-1 font-bold text-base">
                  {String(os.numero_os).padStart(4, '0')}
                </div>
                <div className="border-b border-r border-black p-1">
                  <span className="font-bold">Nº Revisão:</span>
                </div>
                <div className="border-b border-black p-1">01</div>
              </div>
            </div>
          </div>

          {/* Company Name Row */}
          <div className="flex border-b-2 border-black">
            <div className="flex-1 text-center py-2 font-bold text-sm bg-gray-100">
              {nomeEmpresa}
            </div>
            <div className="w-24 border-l-2 border-black p-1 text-center text-xs">
              <span className="font-bold">Página:</span> 1/1
            </div>
          </div>

          {/* Solicitation Info */}
          <div className="grid grid-cols-4 border-b-2 border-black text-xs">
            <div className="border-r border-black p-2">
              <span className="font-bold">Data da Solicitação:</span>
              <br />
              {dataSolicitacao}
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold">Solicitante:</span>
              <br />
              {os.solicitante.toUpperCase()}
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold">TAG:</span>
              <br />
              {os.tag}
            </div>
            <div className="p-2">
              <span className="font-bold">Tipo:</span>
              <br />
              {tipoLabels[os.tipo] || os.tipo} - {prioridadeLabels[os.prioridade] || os.prioridade}
            </div>
          </div>

          {/* Equipment */}
          <div className="border-b-2 border-black p-2 text-xs">
            <span className="font-bold">Equipamento:</span> {os.equipamento.toUpperCase()}
          </div>

          {/* Problem Section */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">
              Problema Apresentado:
            </div>
            <div className="p-3 min-h-[60px] text-sm">
              {os.problema.toUpperCase()}
            </div>
          </div>

          {/* Maintainers Section */}
          <div className="grid grid-cols-2 border-b-2 border-black text-xs">
            <div className="border-r-2 border-black">
              <div className="bg-gray-200 p-2 font-bold border-b border-black">
                Nome do manutentor 1:
              </div>
              <div className="p-2 h-8 border-b border-black"></div>
              <div className="grid grid-cols-2">
                <div className="border-r border-black p-2">
                  <span className="font-bold">Ass.:</span>
                </div>
                <div className="p-2">
                  <span className="font-bold">Data.:</span> ___/___/___
                </div>
              </div>
            </div>
            <div>
              <div className="bg-gray-200 p-2 font-bold border-b border-black">
                Nome do manutentor 2:
              </div>
              <div className="p-2 h-8 border-b border-black"></div>
              <div className="grid grid-cols-2">
                <div className="border-r border-black p-2">
                  <span className="font-bold">Ass.:</span>
                </div>
                <div className="p-2">
                  <span className="font-bold">Data.:</span> ___/___/___
                </div>
              </div>
            </div>
          </div>

          {/* Time Section */}
          <div className="grid grid-cols-3 border-b-2 border-black text-xs">
            <div className="border-r border-black p-2">
              <span className="font-bold">Hora inicial:</span>
              <div className="h-6 mt-1 border-b border-dashed border-gray-400"></div>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold">Hora Final:</span>
              <div className="h-6 mt-1 border-b border-dashed border-gray-400"></div>
            </div>
            <div className="p-2">
              <span className="font-bold">Tempo total:</span>
              <div className="h-6 mt-1 border-b border-dashed border-gray-400"></div>
            </div>
          </div>

          {/* Service Description */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">
              Descrição do Serviço executado:
            </div>
            <div className="min-h-[100px] p-2">
              <div className="border-b border-dashed border-gray-300 h-6"></div>
              <div className="border-b border-dashed border-gray-300 h-6"></div>
              <div className="border-b border-dashed border-gray-300 h-6"></div>
              <div className="border-b border-dashed border-gray-300 h-6"></div>
            </div>
          </div>

          {/* Parts Used */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">
              Peças utilizadas e quantidade:
            </div>
            <div className="min-h-[60px] p-2">
              <div className="border-b border-dashed border-gray-300 h-6"></div>
              <div className="border-b border-dashed border-gray-300 h-6"></div>
            </div>
          </div>

          {/* Service Finished */}
          <div className="grid grid-cols-2 border-b-2 border-black text-xs">
            <div className="border-r-2 border-black p-2">
              <span className="font-bold">Serviço finalizado:</span>
              <div className="mt-2 flex gap-6">
                <label className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border border-black"></span>
                  Sim
                </label>
                <label className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border border-black"></span>
                  Não
                </label>
              </div>
            </div>
            <div className="p-2">
              <span className="font-bold">Equipamento liberado para uso:</span>
              <div className="mt-2 flex gap-6">
                <label className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border border-black"></span>
                  Sim
                </label>
                <label className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border border-black"></span>
                  Não
                </label>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">
              Observações:
            </div>
            <div className="min-h-[50px] p-2">
              <div className="border-b border-dashed border-gray-300 h-6"></div>
              <div className="border-b border-dashed border-gray-300 h-6"></div>
            </div>
          </div>

          {/* Signature */}
          <div className="p-4 text-center text-xs">
            <div className="mt-8 pt-2">
              <span className="font-bold">Assinatura Resp.</span>________________________
              <span className="ml-4 font-bold">Data</span>____/____/____
            </div>
          </div>
        </div>

        {/* Footer Info - Tempo e Custo Estimado */}
        {(os.tempo_estimado || os.custo_estimado) && (
          <div className="mt-4 text-xs text-gray-500 border border-gray-300 p-2">
            <span className="font-bold">Informações do PCM:</span>
            {os.tempo_estimado && <span className="ml-4">Tempo Estimado: {os.tempo_estimado} min</span>}
            {os.custo_estimado && <span className="ml-4">Custo Estimado: R$ {os.custo_estimado.toFixed(2)}</span>}
          </div>
        )}
      </div>
    );
  }
);

OSPrintTemplate.displayName = 'OSPrintTemplate';
