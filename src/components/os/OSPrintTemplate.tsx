import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoEmpresa from '@/assets/logo-empresa.jpg';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';

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
}

export const OSPrintTemplate = forwardRef<HTMLDivElement, OSPrintTemplateProps>(
  ({ os, nomeEmpresa = "MANUTENÇÃO INDUSTRIAL", empresa }, ref) => {
    const dataEmissao = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const dataSolicitacao = format(new Date(os.data_solicitacao), "dd/MM/yyyy", { locale: ptBR });

    const displayName = empresa?.nome_fantasia || empresa?.razao_social || nomeEmpresa;
    const logoUrl = empresa?.logo_os_url || '';

    const tipoLabels: Record<string, string> = {
      CORRETIVA: 'Corretiva', PREVENTIVA: 'Preventiva', PREDITIVA: 'Preditiva',
      INSPECAO: 'Inspeção', MELHORIA: 'Melhoria',
    };
    const prioridadeLabels: Record<string, string> = {
      URGENTE: 'Urgente', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa',
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 w-[210mm] min-h-[297mm] mx-auto print:p-4"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
      >
        <div className="border-2 border-black">
          {/* Header */}
          <div className="flex border-b-2 border-black">
            <div className="w-28 border-r-2 border-black p-2 flex items-center justify-center">
              <img src={logoUrl || logoEmpresa} alt="Logo" className="h-16 w-auto object-contain" />
            </div>
            <div className="flex-1 text-center py-3">
              <h1 className="text-xl font-bold">ORDEM DE SERVIÇO</h1>
              <p className="text-xs text-gray-600 mt-1">{displayName}</p>
            </div>
            <div className="w-48 border-l-2 border-black text-xs">
              <div className="grid grid-cols-2">
                <div className="border-b border-r border-black p-1"><span className="font-bold">Data Emissão:</span></div>
                <div className="border-b border-black p-1">{dataEmissao}</div>
                <div className="border-b border-r border-black p-1"><span className="font-bold">Nº O.S:</span></div>
                <div className="border-b border-black p-1 font-bold text-base">{String(os.numero_os).padStart(4, '0')}</div>
                <div className="border-b border-r border-black p-1"><span className="font-bold">Revisão:</span></div>
                <div className="border-b border-black p-1">01</div>
                <div className="border-r border-black p-1"><span className="font-bold">Página:</span></div>
                <div className="p-1">1/1</div>
              </div>
            </div>
          </div>

          {/* Company Info Bar */}
          {empresa && (
            <div className="border-b-2 border-black px-3 py-1 text-xs bg-gray-50 flex justify-between">
              <span>{empresa.cnpj && `CNPJ: ${empresa.cnpj}`}</span>
              <span>{empresa.telefone && `Tel: ${empresa.telefone}`}</span>
              <span>{empresa.email}</span>
            </div>
          )}

          {/* Solicitation Info */}
          <div className="grid grid-cols-4 border-b-2 border-black text-xs">
            <div className="border-r border-black p-2">
              <span className="font-bold">Data Solicitação:</span><br />{dataSolicitacao}
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold">Solicitante:</span><br />{os.solicitante.toUpperCase()}
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold">TAG:</span><br /><span className="font-mono font-bold text-sm">{os.tag}</span>
            </div>
            <div className="p-2">
              <span className="font-bold">Tipo / Prioridade:</span><br />
              {tipoLabels[os.tipo] || os.tipo} — <span className="font-bold">{prioridadeLabels[os.prioridade] || os.prioridade}</span>
            </div>
          </div>

          {/* Equipment */}
          <div className="border-b-2 border-black p-2 text-xs">
            <span className="font-bold">Equipamento:</span> {os.equipamento.toUpperCase()}
          </div>

          {/* Problem */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">PROBLEMA APRESENTADO</div>
            <div className="p-3 min-h-[60px] text-sm">{os.problema.toUpperCase()}</div>
          </div>

          {/* Maintainers */}
          <div className="grid grid-cols-2 border-b-2 border-black text-xs">
            {[1, 2].map(n => (
              <div key={n} className={n === 1 ? 'border-r-2 border-black' : ''}>
                <div className="bg-gray-200 p-2 font-bold border-b border-black">Manutentor {n}:</div>
                <div className="p-2 h-8 border-b border-black"></div>
                <div className="grid grid-cols-2">
                  <div className="border-r border-black p-2"><span className="font-bold">Assinatura:</span></div>
                  <div className="p-2"><span className="font-bold">Data:</span> ___/___/______</div>
                </div>
              </div>
            ))}
          </div>

          {/* Time */}
          <div className="grid grid-cols-3 border-b-2 border-black text-xs">
            {['Hora Início', 'Hora Fim', 'Tempo Total'].map((label, i) => (
              <div key={label} className={`p-2 ${i < 2 ? 'border-r border-black' : ''}`}>
                <span className="font-bold">{label}:</span>
                <div className="h-6 mt-1 border-b border-dashed border-gray-400"></div>
              </div>
            ))}
          </div>

          {/* Service Description */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">SERVIÇO EXECUTADO</div>
            <div className="min-h-[100px] p-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-6"></div>)}
            </div>
          </div>

          {/* Parts */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">PEÇAS UTILIZADAS E QUANTIDADE</div>
            <div className="min-h-[60px] p-2">
              {[1, 2, 3].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-6"></div>)}
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 border-b-2 border-black text-xs">
            {['Serviço finalizado', 'Equipamento liberado'].map((label, i) => (
              <div key={label} className={`p-2 ${i === 0 ? 'border-r-2 border-black' : ''}`}>
                <span className="font-bold">{label}:</span>
                <div className="mt-2 flex gap-6">
                  {['Sim', 'Não'].map(opt => (
                    <label key={opt} className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border border-black"></span> {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Observations */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">OBSERVAÇÕES</div>
            <div className="min-h-[50px] p-2">
              {[1, 2].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-6"></div>)}
            </div>
          </div>

          {/* Signature */}
          <div className="p-4 text-center text-xs">
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div>
                <div className="border-b border-black mx-8"></div>
                <p className="font-bold mt-1">Responsável Manutenção</p>
              </div>
              <div>
                <div className="border-b border-black mx-8"></div>
                <p className="font-bold mt-1">Responsável Produção</p>
              </div>
            </div>
            <p className="mt-4 text-gray-500">Data: ___/___/______</p>
          </div>
        </div>

        {/* Footer */}
        {(os.tempo_estimado || os.custo_estimado) && (
          <div className="mt-4 text-xs text-gray-500 border border-gray-300 p-2">
            <span className="font-bold">Informações PCM:</span>
            {os.tempo_estimado && <span className="ml-4">Tempo Estimado: {os.tempo_estimado} min</span>}
            {os.custo_estimado && <span className="ml-4">Custo Estimado: R$ {os.custo_estimado.toFixed(2)}</span>}
          </div>
        )}

        {empresa && (
          <div className="mt-2 text-center text-xs text-gray-400">
            {displayName} {empresa.endereco && `• ${empresa.endereco}`} {empresa.cidade && `• ${empresa.cidade}/${empresa.estado}`}
          </div>
        )}
      </div>
    );
  }
);

OSPrintTemplate.displayName = 'OSPrintTemplate';
