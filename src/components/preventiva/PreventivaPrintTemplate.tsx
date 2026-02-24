import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoEmpresa from '@/assets/logo-empresa.jpg';
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
}

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const PreventivaPrintTemplate = forwardRef<HTMLDivElement, PreventivaPrintTemplateProps>(
  ({ data, empresa }, ref) => {
    const { plano, atividades, tempoTotal } = data;
    const dataEmissao = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    const displayName = empresa?.nome_fantasia || empresa?.razao_social || 'MANUTENÇÃO INDUSTRIAL';
    const logoUrl = empresa?.logo_pdf_url || empresa?.logo_os_url || '';
    const proximaExec = plano.proxima_execucao
      ? format(new Date(plano.proxima_execucao), 'dd/MM/yyyy', { locale: ptBR })
      : 'N/A';

    const tipoGatilho: Record<string, string> = {
      TEMPO: 'Tempo', CICLO: 'Ciclo', CONDICAO: 'Condição',
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 w-[210mm] min-h-[297mm] mx-auto print:p-4"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
      >
        <div className="border-2 border-black">
          {/* ═══ HEADER ═══ */}
          <div className="flex border-b-2 border-black">
            <div className="w-28 border-r-2 border-black p-2 flex items-center justify-center">
              <img src={logoUrl || logoEmpresa} alt="Logo" className="h-16 w-auto object-contain" />
            </div>
            <div className="flex-1 text-center py-3">
              <h1 className="text-xl font-bold">PLANO DE MANUTENÇÃO PREVENTIVA</h1>
              <p className="text-xs text-gray-600 mt-1">{displayName}</p>
            </div>
            <div className="w-48 border-l-2 border-black text-xs">
              <div className="grid grid-cols-2">
                <div className="border-b border-r border-black p-1"><span className="font-bold">Data Emissão:</span></div>
                <div className="border-b border-black p-1">{dataEmissao}</div>
                <div className="border-b border-r border-black p-1"><span className="font-bold">Código:</span></div>
                <div className="border-b border-black p-1 font-bold text-base">{plano.codigo}</div>
                <div className="border-b border-r border-black p-1"><span className="font-bold">Revisão:</span></div>
                <div className="border-b border-black p-1">01</div>
                <div className="border-r border-black p-1"><span className="font-bold">Página:</span></div>
                <div className="p-1">1/1</div>
              </div>
            </div>
          </div>

          {/* ═══ COMPANY INFO BAR ═══ */}
          {empresa && (
            <div className="border-b-2 border-black px-3 py-1 text-xs bg-gray-50 flex justify-between">
              <span>{empresa.cnpj && `CNPJ: ${empresa.cnpj}`}</span>
              <span>{empresa.telefone && `Tel: ${empresa.telefone}`}</span>
              <span>{empresa.email}</span>
            </div>
          )}

          {/* ═══ PLAN INFO ═══ */}
          <div className="grid grid-cols-4 border-b-2 border-black text-xs">
            <div className="border-r border-black p-2">
              <span className="font-bold">TAG:</span><br />
              <span className="font-mono font-bold text-sm">{plano.tag || 'N/A'}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold">Tipo Gatilho:</span><br />
              {tipoGatilho[plano.tipo_gatilho] || plano.tipo_gatilho}
            </div>
            <div className="border-r border-black p-2">
              <span className="font-bold">Frequência:</span><br />
              {plano.frequencia_dias} dias
            </div>
            <div className="p-2">
              <span className="font-bold">Próxima Execução:</span><br />
              {proximaExec}
            </div>
          </div>

          {/* ═══ PLAN NAME ═══ */}
          <div className="border-b-2 border-black p-2 text-xs">
            <span className="font-bold">Plano:</span> {plano.nome.toUpperCase()}
          </div>

          {/* ═══ DESCRIPTION ═══ */}
          {plano.descricao && (
            <div className="border-b-2 border-black">
              <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">DESCRIÇÃO</div>
              <div className="p-3 min-h-[40px] text-sm">{plano.descricao}</div>
            </div>
          )}

          {/* ═══ ACTIVITIES & SERVICES TABLE ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">
              ATIVIDADES E SERVIÇOS — TEMPO TOTAL: {formatMin(tempoTotal)}
            </div>

            {atividades.map((atv, aIdx) => (
              <div key={atv.id}>
                {/* Activity header row */}
                <div className="flex border-b border-black bg-gray-100">
                  <div className="w-10 border-r border-black p-2 text-center font-bold text-xs">{aIdx + 1}</div>
                  <div className="flex-1 p-2 text-xs">
                    <span className="font-bold">{atv.nome.toUpperCase()}</span>
                    {atv.responsavel && <span className="ml-4 text-gray-600">Resp: {atv.responsavel}</span>}
                  </div>
                  <div className="w-24 border-l border-black p-2 text-center text-xs font-bold">{formatMin(atv.tempo_total_min)}</div>
                </div>

                {/* Services grid header */}
                {(atv.servicos || []).length > 0 && (
                  <div className="flex border-b border-black bg-gray-50 text-[10px] font-bold">
                    <div className="w-10 border-r border-black p-1 text-center">#</div>
                    <div className="flex-1 p-1 pl-4">SERVIÇO</div>
                    <div className="w-20 border-l border-black p-1 text-center">TEMPO</div>
                    <div className="w-16 border-l border-black p-1 text-center">OK</div>
                  </div>
                )}

                {/* Services rows */}
                {(atv.servicos || []).map((srv, sIdx) => (
                  <div key={srv.id} className="flex border-b border-black text-xs">
                    <div className="w-10 border-r border-black p-1 text-center text-gray-500">{aIdx + 1}.{sIdx + 1}</div>
                    <div className="flex-1 p-1 pl-4">{srv.descricao}</div>
                    <div className="w-20 border-l border-black p-1 text-center font-mono">{formatMin(srv.tempo_estimado_min)}</div>
                    <div className="w-16 border-l border-black p-1 flex items-center justify-center">
                      <span className="inline-block w-4 h-4 border border-black"></span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {atividades.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-500">Nenhuma atividade cadastrada</div>
            )}
          </div>

          {/* ═══ EXECUTOR ═══ */}
          <div className="grid grid-cols-2 border-b-2 border-black text-xs">
            {[1, 2].map(n => (
              <div key={n} className={n === 1 ? 'border-r-2 border-black' : ''}>
                <div className="bg-gray-200 p-2 font-bold border-b border-black">Executor {n}:</div>
                <div className="p-2 h-8 border-b border-black"></div>
                <div className="grid grid-cols-2">
                  <div className="border-r border-black p-2"><span className="font-bold">Assinatura:</span></div>
                  <div className="p-2"><span className="font-bold">Data:</span> ___/___/______</div>
                </div>
              </div>
            ))}
          </div>

          {/* ═══ TIME ═══ */}
          <div className="grid grid-cols-3 border-b-2 border-black text-xs">
            {['Hora Início', 'Hora Fim', 'Tempo Total Real'].map((label, i) => (
              <div key={label} className={`p-2 ${i < 2 ? 'border-r border-black' : ''}`}>
                <span className="font-bold">{label}:</span>
                <div className="h-6 mt-1 border-b border-dashed border-gray-400"></div>
              </div>
            ))}
          </div>

          {/* ═══ INSTRUCTIONS ═══ */}
          {plano.instrucoes && (
            <div className="border-b-2 border-black">
              <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">INSTRUÇÕES DE EXECUÇÃO</div>
              <div className="p-3 min-h-[50px] text-xs whitespace-pre-wrap">{plano.instrucoes}</div>
            </div>
          )}

          {/* ═══ MATERIALS USED ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">PEÇAS / MATERIAIS UTILIZADOS</div>
            <div className="min-h-[50px] p-2">
              {[1, 2, 3].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-6"></div>)}
            </div>
          </div>

          {/* ═══ STATUS ═══ */}
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

          {/* ═══ OBSERVATIONS ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-200 p-2 font-bold text-xs border-b border-black">OBSERVAÇÕES</div>
            <div className="min-h-[50px] p-2">
              {[1, 2].map(i => <div key={i} className="border-b border-dashed border-gray-300 h-6"></div>)}
            </div>
          </div>

          {/* ═══ SIGNATURES ═══ */}
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

        {/* ═══ PCM FOOTER ═══ */}
        <div className="mt-4 text-xs text-gray-500 border border-gray-300 p-2">
          <span className="font-bold">Informações PCM:</span>
          <span className="ml-4">Tempo Estimado Total: {formatMin(tempoTotal)}</span>
          <span className="ml-4">Atividades: {atividades.length}</span>
          <span className="ml-4">Serviços: {atividades.reduce((s, a) => s + (a.servicos?.length || 0), 0)}</span>
        </div>

        {empresa && (
          <div className="mt-2 text-center text-xs text-gray-400">
            {displayName} {empresa.endereco && `• ${empresa.endereco}`} {empresa.cidade && `• ${empresa.cidade}/${empresa.estado}`}
          </div>
        )}
      </div>
    );
  }
);

PreventivaPrintTemplate.displayName = 'PreventivaPrintTemplate';
