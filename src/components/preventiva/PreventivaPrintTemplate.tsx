import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import type { PlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import type { AtividadePreventiva } from '@/hooks/useAtividadesPreventivas';

interface PreventivaData {
  plano: PlanoPreventivo;
  atividades: AtividadePreventiva[];
  tempoTotal: number;
}

interface PreventivaPrintTemplateProps {
  data: PreventivaData;
  empresa?: DadosEmpresa | null;
  documentNumber?: string;
}

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const PreventivaPrintTemplate = forwardRef<HTMLDivElement, PreventivaPrintTemplateProps>(
  ({ data, empresa, documentNumber }, ref) => {
    const { plano, atividades, tempoTotal } = data;
    const dataEmissao = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    const displayName = empresa?.nome_fantasia || empresa?.razao_social || 'MANUTENÇÃO INDUSTRIAL';
    const logoUrl = empresa?.logo_pdf_url || empresa?.logo_os_url || '';
    const docNum = documentNumber || `PR-${plano.codigo}`;
    const proximaExec = plano.proxima_execucao
      ? format(new Date(plano.proxima_execucao), 'dd/MM/yyyy', { locale: ptBR })
      : 'N/A';

    const tipoGatilho: Record<string, string> = {
      TEMPO: 'Tempo', CICLO: 'Ciclo', CONDICAO: 'Condição',
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
              <h1 className="text-[16px] font-black tracking-tight mt-0.5">PLANO DE MANUTENÇÃO PREVENTIVA</h1>
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

          {/* ═══ PLAN INFO ═══ */}
          <div className="grid grid-cols-4 border-b-2 border-black text-[9px]">
            <div className="border-r border-black p-2">
              <span className="font-bold text-gray-500 text-[8px] block">TAG / MÁQUINA</span>
              <span className="font-mono font-black text-[11px]">{plano.tag || 'N/A'}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold text-gray-500 text-[8px] block">TIPO GATILHO</span>
              <span className="font-semibold">{tipoGatilho[plano.tipo_gatilho] || plano.tipo_gatilho}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold text-gray-500 text-[8px] block">FREQUÊNCIA</span>
              <span className="font-semibold">{plano.frequencia_dias} dias</span>
            </div>
            <div className="p-2">
              <span className="font-bold text-gray-500 text-[8px] block">PRÓXIMA EXECUÇÃO</span>
              <span className="font-semibold">{proximaExec}</span>
            </div>
          </div>

          {/* ═══ PLAN NAME ═══ */}
          <div className="border-b-2 border-black p-2 text-[9px]">
            <span className="font-bold text-gray-500 text-[8px]">PLANO: </span>
            <span className="font-semibold">{plano.nome.toUpperCase()}</span>
            {plano.responsavel_nome && (
              <span className="ml-4 text-gray-500">Responsável: {plano.responsavel_nome}</span>
            )}
          </div>

          {/* ═══ DESCRIPTION ═══ */}
          {plano.descricao && (
            <div className="border-b-2 border-black">
              <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">DESCRIÇÃO</div>
              <div className="p-2 min-h-[10mm] text-[9px]">{plano.descricao}</div>
            </div>
          )}

          {/* ═══ ACTIVITIES & SERVICES TABLE ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider flex justify-between">
              <span>ATIVIDADES E SERVIÇOS</span>
              <span>TEMPO TOTAL: {formatMin(tempoTotal)}</span>
            </div>

            {atividades.map((atv, aIdx) => (
              <div key={atv.id}>
                {/* Activity header */}
                <div className="flex border-b border-black bg-gray-50">
                  <div className="w-[8mm] border-r border-black p-1.5 text-center font-black text-[9px]">{aIdx + 1}</div>
                  <div className="flex-1 p-1.5 text-[9px]">
                    <span className="font-bold">{atv.nome.toUpperCase()}</span>
                    {atv.responsavel && <span className="ml-3 text-gray-500 text-[8px]">Resp: {atv.responsavel}</span>}
                  </div>
                  <div className="w-[20mm] border-l border-black p-1.5 text-center text-[9px] font-bold font-mono">{formatMin(atv.tempo_total_min)}</div>
                </div>

                {/* Services grid header */}
                {(atv.servicos || []).length > 0 && (
                  <div className="flex border-b border-black text-[8px] font-bold text-gray-500">
                    <div className="w-[8mm] border-r border-black p-1 text-center">#</div>
                    <div className="flex-1 p-1 pl-3">SERVIÇO</div>
                    <div className="w-[18mm] border-l border-black p-1 text-center">TEMPO</div>
                    <div className="w-[14mm] border-l border-black p-1 text-center">OK</div>
                  </div>
                )}

                {/* Services rows */}
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
          <div className="grid grid-cols-2 border-b-2 border-black text-[9px]">
            {[1, 2].map(n => (
              <div key={n} className={n === 1 ? 'border-r-2 border-black' : ''}>
                <div className="bg-gray-100 p-2 font-bold border-b border-black tracking-wider text-[9px]">EXECUTOR {n}</div>
                <div className="p-2 h-7 border-b border-black"></div>
                <div className="grid grid-cols-2">
                  <div className="border-r border-black p-1.5"><span className="font-bold">Assinatura:</span></div>
                  <div className="p-1.5"><span className="font-bold">Data:</span> ___/___/______</div>
                </div>
              </div>
            ))}
          </div>

          {/* ═══ TIME ═══ */}
          <div className="grid grid-cols-3 border-b-2 border-black text-[9px]">
            {['HORA INÍCIO', 'HORA FIM', 'TEMPO TOTAL REAL'].map((label, i) => (
              <div key={label} className={`p-2 ${i < 2 ? 'border-r border-black' : ''}`}>
                <span className="font-bold text-gray-500 text-[8px]">{label}:</span>
                <div className="h-5 mt-1 border-b border-dashed border-gray-400"></div>
              </div>
            ))}
          </div>

          {/* ═══ INSTRUCTIONS ═══ */}
          {plano.instrucoes && (
            <div className="border-b-2 border-black">
              <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">INSTRUÇÕES DE EXECUÇÃO</div>
              <div className="p-2 min-h-[12mm] text-[9px] whitespace-pre-wrap">{plano.instrucoes}</div>
            </div>
          )}

          {/* ═══ MATERIALS ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">PEÇAS / MATERIAIS UTILIZADOS</div>
            <div className="min-h-[12mm] p-2">
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

PreventivaPrintTemplate.displayName = 'PreventivaPrintTemplate';
