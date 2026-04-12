import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import type { PlanoLubrificacao, RotaPonto } from '@/types/lubrificacao';
import {
  DocumentPrintBase,
  PrintInfoGrid,
  PrintSectionHeader,
  PrintBlankLines,
  PrintTimeRow,
  PrintStatusCheckboxes,
  PrintExecutorBlock,
} from '@/components/print/DocumentPrintBase';

interface LubrificacaoPrintTemplateProps {
  plano: PlanoLubrificacao;
  pontos?: RotaPonto[];
  empresa?: DadosEmpresa | null;
  equipamentoNome?: string;
}

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const prioridadeLabel: Record<string, string> = {
  critica: 'CRÍTICA', alta: 'ALTA', media: 'MÉDIA', baixa: 'BAIXA',
};

const EPI_ITEMS = [
  'Óculos de proteção',
  'Luvas nitrílicas',
  'Protetor auricular',
  'Calçado de segurança',
  'Avental / uniforme',
  'Máscara respiratória',
];

export const LubrificacaoPrintTemplate = forwardRef<HTMLDivElement, LubrificacaoPrintTemplateProps>(
  ({ plano, pontos = [], empresa, equipamentoNome }, ref) => {
    const docNum = `LUB-${plano.codigo}`;
    const periodicidade = plano.periodicidade
      ? `${plano.periodicidade} ${plano.tipo_periodicidade || 'dias'}`
      : 'N/A';

    const proximaExec = plano.proxima_execucao
      ? format(new Date(plano.proxima_execucao), 'dd/MM/yyyy', { locale: ptBR })
      : 'N/A';

    const ultimaExec = plano.ultima_execucao
      ? format(new Date(plano.ultima_execucao), 'dd/MM/yyyy', { locale: ptBR })
      : 'N/A';

    const tempoTotal = pontos.length > 0
      ? pontos.reduce((sum, p) => sum + (p.tempo_estimado_min || 0), 0)
      : (plano.tempo_estimado || 0);

    // Consolidated lubricant summary
    const lubSummary = useMemo(() => {
      const map = new Map<string, { qty: string[]; count: number }>();
      pontos.forEach((p) => {
        const lub = (p.lubrificante || '').trim();
        if (!lub) return;
        const entry = map.get(lub) || { qty: [], count: 0 };
        entry.count++;
        if (p.quantidade) entry.qty.push(p.quantidade);
        map.set(lub, entry);
      });
      return Array.from(map.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        qty: data.qty.join(', ') || '—',
      }));
    }, [pontos]);

    // Pontos that have ferramenta listed
    const ferramentas = useMemo(() => {
      const set = new Set<string>();
      pontos.forEach((p) => { if (p.ferramenta) set.add(p.ferramenta); });
      return Array.from(set);
    }, [pontos]);

    return (
      <DocumentPrintBase
        ref={ref}
        title="PLANO DE LUBRIFICAÇÃO"
        documentNumber={docNum}
        empresa={empresa}
      >
        {/* ═══ ROW 1: EQUIPAMENTO + TAG + PRIORIDADE + RESPONSÁVEL ═══ */}
        <PrintInfoGrid items={[
          { label: 'EQUIPAMENTO', value: equipamentoNome || 'N/A' },
          { label: 'PRIORIDADE', value: prioridadeLabel[plano.prioridade || 'media'] || 'MÉDIA', mono: true },
          { label: 'RESPONSÁVEL', value: plano.responsavel_nome || '—' },
        ]} />

        {/* ═══ ROW 2: LUBRIFICANTE + PERIODICIDADE + TEMPO + DATAS ═══ */}
        <PrintInfoGrid items={[
          { label: 'LUBRIFICANTE PRINCIPAL', value: plano.lubrificante || '—' },
          { label: 'PERIODICIDADE', value: periodicidade },
          { label: 'TEMPO ESTIMADO', value: formatMin(tempoTotal) },
          { label: 'PRÓXIMA EXECUÇÃO', value: proximaExec, mono: true },
        ]} />

        {/* ═══ PLAN NAME + PONTO ═══ */}
        <div className="border-b-2 border-black p-2 text-[9px]">
          <div className="flex justify-between">
            <div>
              <span className="font-bold text-gray-500 text-[8px]">PLANO: </span>
              <span className="font-semibold">{plano.nome.toUpperCase()}</span>
            </div>
            <div>
              <span className="font-bold text-gray-500 text-[8px]">ÚLT. EXECUÇÃO: </span>
              <span>{ultimaExec}</span>
            </div>
          </div>
          {/* R4: ponto_lubrificacao só aparece quando NÃO há pontos */}
          {pontos.length === 0 && plano.ponto_lubrificacao && (
            <div className="mt-0.5">
              <span className="font-bold text-gray-500 text-[8px]">PONTO DE LUBRIFICAÇÃO: </span>
              <span>{plano.ponto_lubrificacao}</span>
            </div>
          )}
        </div>

        {/* ═══ DESCRIPTION ═══ */}
        {plano.descricao && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="DESCRIÇÃO / ESCOPO DO SERVIÇO" />
            <div className="p-2 min-h-[10mm] text-[9px] whitespace-pre-wrap">{plano.descricao}</div>
          </div>
        )}

        {/* ═══ EPI / SEGURANÇA ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="EPI / REQUISITOS DE SEGURANÇA" />
          <div className="grid grid-cols-3 p-2 gap-x-4 gap-y-1 text-[9px]">
            {EPI_ITEMS.map((item) => (
              <label key={item} className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 border border-black flex-shrink-0"></span>
                <span>{item}</span>
              </label>
            ))}
          </div>
          <div className="px-2 pb-1.5 text-[8px]">
            <span className="font-bold text-gray-500">Outros: </span>
            <span className="border-b border-dashed border-gray-400 inline-block w-[120mm]">&nbsp;</span>
          </div>
        </div>

        {/* ═══ CONDIÇÃO PRÉ-EXECUÇÃO ═══ */}
        <div className="border-b-2 border-black">
          <PrintSectionHeader label="CONDIÇÃO DO EQUIPAMENTO PRÉ-EXECUÇÃO" />
          <div className="p-2 text-[9px]">
            <div className="flex gap-6 mb-1">
              {['Normal', 'Com vibração', 'Superaquecido', 'Vazamento', 'Ruído anormal', 'Outro'].map((cond) => (
                <label key={cond} className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-3.5 border border-black flex-shrink-0"></span>
                  <span>{cond}</span>
                </label>
              ))}
            </div>
            <div className="mt-1">
              <span className="font-bold text-gray-500 text-[8px]">Observação: </span>
              <span className="border-b border-dashed border-gray-400 inline-block w-[140mm]">&nbsp;</span>
            </div>
          </div>
        </div>

        {/* ═══ CHECKLIST TABLE (7 colunas legíveis) ═══ */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider flex justify-between">
            <span>CHECKLIST DE LUBRIFICAÇÃO</span>
            <span>{pontos.length > 0 ? `${pontos.length} pontos • Tempo total: ${formatMin(tempoTotal)}` : ''}</span>
          </div>

          {/* Header */}
          <div className="flex border-b border-black text-[8px] font-bold text-gray-600 uppercase bg-gray-50">
            <div className="w-[7mm] border-r border-black p-1 text-center">ITEM</div>
            <div className="flex-1 p-1 pl-2">DESCRIÇÃO / PONTO</div>
            <div className="w-[24mm] border-l border-black p-1">LUBRIFICANTE</div>
            <div className="w-[14mm] border-l border-black p-1 text-center">QTD</div>
            <div className="w-[14mm] border-l border-black p-1 text-center">MÉTODO</div>
            <div className="w-[12mm] border-l border-black p-1 text-center">MIN</div>
            <div className="w-[10mm] border-l border-black p-1 text-center">✓</div>
          </div>

          {pontos.length > 0 ? (
            pontos.map((p, i) => (
              <div key={p.id}>
                {/* Main row */}
                <div className="flex border-b border-black text-[9px]">
                  <div className="w-[7mm] border-r border-black p-1 text-center font-black">{i + 1}</div>
                  <div className="flex-1 p-1 pl-2 min-h-[6mm]">
                    <span>{p.descricao}</span>
                    {/* R2: Sub-info TAG + Local só quando plano NÃO tem equipamento (multi-ativo) */}
                    {!plano.equipamento_id && (p.equipamento_tag || p.localizacao) && (
                      <div className="text-[7px] text-gray-500 mt-0.5">
                        {p.equipamento_tag && <span className="font-mono mr-2">TAG: {p.equipamento_tag}</span>}
                        {p.localizacao && <span>Local: {p.localizacao}</span>}
                      </div>
                    )}
                  </div>
                  {/* R3: Coluna lubrificante mostra valor somente se diferir do padrão do plano */}
                  <div className="w-[24mm] border-l border-black p-1 text-[8px]">{p.lubrificante && p.lubrificante !== (plano.lubrificante || '') ? p.lubrificante : '—'}</div>
                  <div className="w-[14mm] border-l border-black p-1 text-center">{p.quantidade || '—'}</div>
                  <div className="w-[14mm] border-l border-black p-1 text-center text-[8px]">{p.ferramenta || '—'}</div>
                  <div className="w-[12mm] border-l border-black p-1 text-center font-mono">{p.tempo_estimado_min}</div>
                  <div className="w-[10mm] border-l border-black p-1 flex items-center justify-center">
                    <span className="inline-block w-4 h-4 border border-black"></span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* Fallback: 10 blank lines for manual filling */
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex border-b border-black text-[9px]">
                <div className="w-[7mm] border-r border-black p-1 text-center text-gray-400">{i + 1}</div>
                <div className="flex-1 p-1 pl-2 min-h-[7mm]"></div>
                <div className="w-[24mm] border-l border-black p-1"></div>
                <div className="w-[14mm] border-l border-black p-1"></div>
                <div className="w-[14mm] border-l border-black p-1"></div>
                <div className="w-[12mm] border-l border-black p-1"></div>
                <div className="w-[10mm] border-l border-black p-1 flex items-center justify-center">
                  <span className="inline-block w-4 h-4 border border-black"></span>
                </div>
              </div>
            ))
          )}

          {/* Legenda */}
          <div className="px-2 py-1 text-[7px] text-gray-500 bg-gray-50 border-t border-black flex gap-6">
            <span>✓ = Conforme / Executado</span>
            <span>Em branco = Não executado</span>
            <span>NA = Não aplicável</span>
          </div>
        </div>

        {/* ═══ INSTRUCTIONS FROM PONTOS ═══ */}
        {pontos.some((p) => p.instrucoes) && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="INSTRUÇÕES POR PONTO" />
            <div className="p-2 text-[9px] space-y-0.5">
              {pontos.filter((p) => p.instrucoes).map((p, _i, _filteredArr) => {
                const itemIdx = pontos.indexOf(p);
                return (
                  <p key={p.id}><strong className="font-mono">Item {itemIdx + 1}:</strong> {p.instrucoes}</p>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ RESUMO DE LUBRIFICANTES ═══ */}
        {lubSummary.length > 0 && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="RESUMO DE LUBRIFICANTES" />
            <div className="flex border-b border-black text-[8px] font-bold text-gray-600 bg-gray-50">
              <div className="flex-1 p-1.5 pl-2">LUBRIFICANTE</div>
              <div className="w-[20mm] border-l border-black p-1.5 text-center">PONTOS</div>
              <div className="w-[30mm] border-l border-black p-1.5 text-center">QTD. TOTAL</div>
            </div>
            {lubSummary.map((item, i) => (
              <div key={i} className="flex border-b border-black text-[9px]">
                <div className="flex-1 p-1.5 pl-2 font-semibold">{item.name}</div>
                <div className="w-[20mm] border-l border-black p-1.5 text-center">{item.count}</div>
                <div className="w-[30mm] border-l border-black p-1.5 text-center">{item.qty}</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ FERRAMENTAS NECESSÁRIAS ═══ */}
        {ferramentas.length > 0 && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="FERRAMENTAS NECESSÁRIAS" />
            <div className="p-2 text-[9px]">
              {ferramentas.map((f, i) => (
                <span key={i} className="inline-block mr-4">
                  <span className="inline-block w-3.5 h-3.5 border border-black mr-1 align-middle"></span>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EXECUTOR ═══ */}
        <PrintExecutorBlock count={2} label="LUBRIFICADOR" />

        {/* ═══ TIME ═══ */}
        <PrintTimeRow />

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
          <PrintBlankLines count={3} />
        </div>
      </DocumentPrintBase>
    );
  }
);

LubrificacaoPrintTemplate.displayName = 'LubrificacaoPrintTemplate';
