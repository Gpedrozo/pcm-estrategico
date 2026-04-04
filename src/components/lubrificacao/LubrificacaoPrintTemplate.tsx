import { forwardRef } from 'react';
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
}

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const LubrificacaoPrintTemplate = forwardRef<HTMLDivElement, LubrificacaoPrintTemplateProps>(
  ({ plano, pontos = [], empresa }, ref) => {
    const docNum = `LUB-${plano.codigo}`;
    const periodicidade = plano.periodicidade_valor
      ? `${plano.periodicidade_valor} ${plano.periodicidade_tipo || 'DIAS'}`
      : plano.periodicidade
        ? `${plano.periodicidade} ${plano.tipo_periodicidade || 'dias'}`
        : 'N/A';

    const proximaExec = plano.ultima_execucao
      ? format(new Date(plano.ultima_execucao), 'dd/MM/yyyy', { locale: ptBR })
      : 'N/A';

    const criticidadeLabel: Record<string, string> = {
      ALTA: 'ALTA', MEDIA: 'MÉDIA', BAIXA: 'BAIXA',
      critica: 'CRÍTICA', alta: 'ALTA', media: 'MÉDIA', baixa: 'BAIXA',
    };

    return (
      <DocumentPrintBase
        ref={ref}
        title="PLANO DE LUBRIFICAÇÃO"
        documentNumber={docNum}
        empresa={empresa}
      >
        {/* ═══ PLAN INFO ═══ */}
        <PrintInfoGrid items={[
          { label: 'TAG / MÁQUINA', value: plano.tag || 'N/A', mono: true },
          { label: 'PERIODICIDADE', value: periodicidade },
          { label: 'TEMPO ESTIMADO', value: formatMin(plano.tempo_estimado_min || plano.tempo_estimado || 0) },
          { label: 'ÚLTIMA EXECUÇÃO', value: proximaExec },
        ]} />

        {/* ═══ PLAN NAME ═══ */}
        <div className="border-b-2 border-black p-2 text-[9px]">
          <span className="font-bold text-gray-500 text-[8px]">PLANO: </span>
          <span className="font-semibold">{plano.nome.toUpperCase()}</span>
          {plano.responsavel && (
            <span className="ml-4 text-gray-500">Responsável: {plano.responsavel}</span>
          )}
          {(plano.nivel_criticidade || plano.prioridade) && (
            <span className="ml-4 text-gray-500">
              Criticidade: {criticidadeLabel[plano.nivel_criticidade || plano.prioridade || ''] || '—'}
            </span>
          )}
        </div>

        {/* ═══ LUBRICATION DETAILS ═══ */}
        <PrintInfoGrid items={[
          { label: 'PONTO DE LUBRIFICAÇÃO', value: plano.ponto_lubrificacao || plano.ponto || '—' },
          { label: 'LUBRIFICANTE', value: plano.tipo_lubrificante || plano.lubrificante || '—' },
          { label: 'CÓD. LUBRIFICANTE', value: plano.codigo_lubrificante || '—' },
          { label: 'QTD. PREVISTA', value: plano.quantidade ? `${plano.quantidade}` : '—' },
        ]} />

        <PrintInfoGrid items={[
          { label: 'LOCALIZAÇÃO', value: plano.localizacao || '—' },
          { label: 'FERRAMENTA', value: plano.ferramenta || '—' },
        ]} />

        {/* ═══ DESCRIPTION ═══ */}
        {plano.descricao && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="DESCRIÇÃO" />
            <div className="p-2 min-h-[10mm] text-[9px]">{plano.descricao}</div>
          </div>
        )}

        {/* ═══ INSTRUCTIONS ═══ */}
        {plano.instrucoes && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="INSTRUÇÕES DE EXECUÇÃO" />
            <div className="p-2 min-h-[12mm] text-[9px] whitespace-pre-wrap">{plano.instrucoes}</div>
          </div>
        )}

        {/* ═══ CHECKLIST TABLE ═══ */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider flex justify-between">
            <span>CHECKLIST DE LUBRIFICAÇÃO</span>
            {pontos.length > 0 && <span className="font-normal text-gray-500">{pontos.length} pontos</span>}
          </div>

          <div className="flex border-b border-black text-[7px] font-bold text-gray-500 uppercase">
            <div className="w-[7mm] border-r border-black p-1 text-center">#</div>
            <div className="w-[14mm] border-r border-black p-1">CÓD</div>
            <div className="w-[14mm] border-r border-black p-1">TAG</div>
            <div className="flex-1 p-1 pl-2">DESCRIÇÃO / PONTO</div>
            <div className="w-[20mm] border-l border-black p-1">LUBRIFICANTE</div>
            <div className="w-[12mm] border-l border-black p-1 text-center">QTD</div>
            <div className="w-[14mm] border-l border-black p-1 text-center">FERRAM.</div>
            <div className="w-[10mm] border-l border-black p-1 text-center">MIN</div>
            <div className="w-[8mm] border-l border-black p-1 text-center">OK</div>
            <div className="w-[8mm] border-l border-black p-1 text-center">NOK</div>
            <div className="w-[20mm] border-l border-black p-1">OBS</div>
          </div>

          {pontos.length > 0 ? (
            pontos.map((p, i) => (
              <div key={p.id} className="flex border-b border-black text-[8px]">
                <div className="w-[7mm] border-r border-black p-1 text-center font-bold">{i + 1}</div>
                <div className="w-[14mm] border-r border-black p-1 font-mono font-semibold">{p.codigo_ponto}</div>
                <div className="w-[14mm] border-r border-black p-1 font-mono text-[7px]">{p.equipamento_tag || '—'}</div>
                <div className="flex-1 p-1 pl-2 min-h-[5mm]">{p.descricao}</div>
                <div className="w-[20mm] border-l border-black p-1 text-[7px]">{p.lubrificante || '—'}</div>
                <div className="w-[12mm] border-l border-black p-1 text-center">{p.quantidade || '—'}</div>
                <div className="w-[14mm] border-l border-black p-1 text-center text-[7px]">{p.ferramenta || '—'}</div>
                <div className="w-[10mm] border-l border-black p-1 text-center">{p.tempo_estimado_min}</div>
                <div className="w-[8mm] border-l border-black p-1 flex items-center justify-center">
                  <span className="inline-block w-3 h-3 border border-black"></span>
                </div>
                <div className="w-[8mm] border-l border-black p-1 flex items-center justify-center">
                  <span className="inline-block w-3 h-3 border border-black"></span>
                </div>
                <div className="w-[20mm] border-l border-black p-1"></div>
              </div>
            ))
          ) : (
            /* Fallback: 8 blank lines for manual filling */
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex border-b border-black text-[9px]">
                <div className="w-[7mm] border-r border-black p-1 text-center text-gray-400">{i + 1}</div>
                <div className="w-[14mm] border-r border-black p-1"></div>
                <div className="w-[14mm] border-r border-black p-1"></div>
                <div className="flex-1 p-1 pl-2 min-h-[6mm]"></div>
                <div className="w-[20mm] border-l border-black p-1"></div>
                <div className="w-[12mm] border-l border-black p-1"></div>
                <div className="w-[14mm] border-l border-black p-1"></div>
                <div className="w-[10mm] border-l border-black p-1"></div>
                <div className="w-[8mm] border-l border-black p-1 flex items-center justify-center">
                  <span className="inline-block w-3 h-3 border border-black"></span>
                </div>
                <div className="w-[8mm] border-l border-black p-1 flex items-center justify-center">
                  <span className="inline-block w-3 h-3 border border-black"></span>
                </div>
                <div className="w-[20mm] border-l border-black p-1"></div>
              </div>
            ))
          )}
        </div>

        {/* ═══ INSTRUCTIONS FROM PONTOS ═══ */}
        {pontos.some((p) => p.instrucoes) && (
          <div className="border-b-2 border-black">
            <PrintSectionHeader label="INSTRUÇÕES POR PONTO" />
            <div className="p-2 text-[8px] space-y-0.5">
              {pontos.filter((p) => p.instrucoes).map((p) => (
                <p key={p.id}><strong>{p.codigo_ponto}:</strong> {p.instrucoes}</p>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EXECUTOR ═══ */}
        <PrintExecutorBlock count={2} label="EXECUTOR" />

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
          {plano.observacoes && (
            <div className="p-2 text-[9px] text-gray-600">{plano.observacoes}</div>
          )}
          <PrintBlankLines count={2} />
        </div>
      </DocumentPrintBase>
    );
  }
);

LubrificacaoPrintTemplate.displayName = 'LubrificacaoPrintTemplate';
