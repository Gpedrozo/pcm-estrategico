import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  documentNumber?: string;
}

export const OSPrintTemplate = forwardRef<HTMLDivElement, OSPrintTemplateProps>(
  ({ os, nomeEmpresa = "MANUTENÇÃO INDUSTRIAL", empresa, documentNumber }, ref) => {
    const dataEmissao = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const dataSolicitacao = format(new Date(os.data_solicitacao), "dd/MM/yyyy", { locale: ptBR });

    const displayName = empresa?.nome_fantasia || empresa?.razao_social || nomeEmpresa;
    const logoUrl = empresa?.logo_os_url || empresa?.logo_pdf_url || '';
    const docNum = documentNumber || `OS-${String(os.numero_os).padStart(6, '0')}`;

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
        className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto"
        style={{ fontFamily: "'Arial', 'Helvetica Neue', sans-serif", fontSize: '10px', padding: '8mm', lineHeight: 1.4 }}
      >
        <div className="border-2 border-black">
          {/* ═══ HEADER ═══ */}
          <div className="flex border-b-2 border-black">
            <div className="w-[25mm] border-r-2 border-black p-2 flex items-center justify-center bg-white">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-[18mm] max-w-[22mm] object-contain" />
              ) : (
                <div className="text-[8px] text-gray-400 text-center">LOGO</div>
              )}
            </div>
            <div className="flex-1 text-center py-2 flex flex-col justify-center">
              <p className="text-[9px] font-bold tracking-widest text-gray-600">{displayName?.toUpperCase()}</p>
              <h1 className="text-[16px] font-black tracking-tight mt-0.5">ORDEM DE SERVIÇO</h1>
            </div>
            <div className="w-[48mm] border-l-2 border-black text-[9px]">
              <div className="border-b border-black p-1.5 flex justify-between">
                <span className="font-bold">Nº Documento:</span>
                <span className="font-black text-[12px]">{docNum}</span>
              </div>
              <div className="border-b border-black p-1.5 flex justify-between">
                <span className="font-bold">Emissão:</span>
                <span>{dataEmissao}</span>
              </div>
              <div className="border-b border-black p-1.5 flex justify-between">
                <span className="font-bold">Revisão:</span>
                <span>00</span>
              </div>
              <div className="p-1.5 flex justify-between">
                <span className="font-bold">Página:</span>
                <span>1 / 1</span>
              </div>
            </div>
          </div>

          {/* ═══ COMPANY INFO ═══ */}
          {empresa && (empresa.cnpj || empresa.telefone || empresa.email) && (
            <div className="border-b-2 border-black px-3 py-1 text-[8px] bg-gray-50 flex justify-between text-gray-600">
              {empresa.cnpj && <span>CNPJ: {empresa.cnpj}</span>}
              {empresa.telefone && <span>Tel: {empresa.telefone}</span>}
              {empresa.email && <span>{empresa.email}</span>}
            </div>
          )}

          {/* ═══ OS INFO ═══ */}
          <div className="grid grid-cols-4 border-b-2 border-black text-[9px]">
            <div className="border-r border-black p-2">
              <span className="font-bold text-gray-500 text-[8px] block">DATA SOLICITAÇÃO</span>
              <span className="font-semibold">{dataSolicitacao}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold text-gray-500 text-[8px] block">SOLICITANTE</span>
              <span className="font-semibold">{os.solicitante.toUpperCase()}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold text-gray-500 text-[8px] block">TAG</span>
              <span className="font-mono font-black text-[11px]">{os.tag}</span>
            </div>
            <div className="p-2">
              <span className="font-bold text-gray-500 text-[8px] block">TIPO / PRIORIDADE</span>
              <span className="font-semibold">{tipoLabels[os.tipo] || os.tipo} — {prioridadeLabels[os.prioridade] || os.prioridade}</span>
            </div>
          </div>

          {/* ═══ EQUIPMENT ═══ */}
          <div className="border-b-2 border-black p-2 text-[9px]">
            <span className="font-bold text-gray-500 text-[8px]">EQUIPAMENTO: </span>
            <span className="font-semibold">{os.equipamento.toUpperCase()}</span>
          </div>

          {/* ═══ PROBLEM ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">PROBLEMA APRESENTADO</div>
            <div className="p-3 min-h-[15mm] text-[10px]">{os.problema.toUpperCase()}</div>
          </div>

          {/* ═══ MAINTAINERS ═══ */}
          <div className="grid grid-cols-2 border-b-2 border-black text-[9px]">
            {[1, 2].map(n => (
              <div key={n} className={n === 1 ? 'border-r-2 border-black' : ''}>
                <div className="bg-gray-100 p-2 font-bold border-b border-black tracking-wider">MANUTENTOR {n}</div>
                <div className="p-2 h-8 border-b border-black"></div>
                <div className="grid grid-cols-2">
                  <div className="border-r border-black p-1.5"><span className="font-bold">Assinatura:</span></div>
                  <div className="p-1.5"><span className="font-bold">Data:</span> ___/___/______</div>
                </div>
              </div>
            ))}
          </div>

          {/* ═══ TIME ═══ */}
          <div className="grid grid-cols-3 border-b-2 border-black text-[9px]">
            {['HORA INÍCIO', 'HORA FIM', 'TEMPO TOTAL'].map((label, i) => (
              <div key={label} className={`p-2 ${i < 2 ? 'border-r border-black' : ''}`}>
                <span className="font-bold text-gray-500 text-[8px]">{label}:</span>
                <div className="h-5 mt-1 border-b border-dashed border-gray-400"></div>
              </div>
            ))}
          </div>

          {/* ═══ SERVICE ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">SERVIÇO EXECUTADO</div>
            <div className="min-h-[25mm] p-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-5"></div>)}
            </div>
          </div>

          {/* ═══ PARTS ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">PEÇAS / MATERIAIS UTILIZADOS</div>
            <div className="min-h-[15mm] p-2">
              {[1, 2, 3].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-5"></div>)}
            </div>
          </div>

          {/* ═══ STATUS ═══ */}
          <div className="grid grid-cols-2 border-b-2 border-black text-[9px]">
            {['Serviço finalizado', 'Equipamento liberado'].map((label, i) => (
              <div key={label} className={`p-2 ${i === 0 ? 'border-r-2 border-black' : ''}`}>
                <span className="font-bold">{label}:</span>
                <div className="mt-1.5 flex gap-6">
                  {['Sim', 'Não'].map(opt => (
                    <label key={opt} className="flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-3.5 border border-black"></span>
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ═══ OBSERVATIONS ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">OBSERVAÇÕES</div>
            <div className="min-h-[12mm] p-2">
              {[1, 2].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-5"></div>)}
            </div>
          </div>

          {/* ═══ SIGNATURES ═══ */}
          <div className="p-4 text-center text-[9px]">
            <div className="grid grid-cols-2 gap-8 mt-4">
              <div>
                <div className="border-b border-black mx-6"></div>
                <p className="font-bold mt-1">Responsável Manutenção</p>
              </div>
              <div>
                <div className="border-b border-black mx-6"></div>
                <p className="font-bold mt-1">Responsável Produção</p>
              </div>
            </div>
            <p className="mt-3 text-gray-500">Data: ___/___/______</p>
          </div>
        </div>

        {/* ═══ PROFESSIONAL FOOTER ═══ */}
        <div className="mt-3 flex justify-between items-center text-[7px] text-gray-400 px-1">
          <span>
            {displayName}
            {empresa?.endereco && ` • ${empresa.endereco}`}
            {empresa?.cidade && ` • ${empresa.cidade}/${empresa.estado}`}
          </span>
          <span>Página 1 de 1 • Versão 1.0 • Emitido em {dataEmissao}</span>
        </div>
      </div>
    );
  }
);

OSPrintTemplate.displayName = 'OSPrintTemplate';
