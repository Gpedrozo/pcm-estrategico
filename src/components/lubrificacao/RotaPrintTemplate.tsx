import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';
import type { RotaLubrificacao, RotaPonto } from '@/types/lubrificacao';
import {
  DocumentPrintBase,
  PrintInfoGrid,
  PrintSectionHeader,
  PrintTimeRow,
  PrintExecutorBlock,
} from '@/components/print/DocumentPrintBase';

interface RotaPrintTemplateProps {
  rota: RotaLubrificacao;
  pontos: RotaPonto[];
  empresa?: DadosEmpresa | null;
}

const FREQ_LABEL: Record<string, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const RotaPrintTemplate = forwardRef<HTMLDivElement, RotaPrintTemplateProps>(
  ({ rota, pontos, empresa }, ref) => {
    const docNum = `ROTA-${rota.codigo}`;
    const tempoTotal = rota.tempo_estimado_total_min ?? pontos.reduce((a, p) => a + (p.tempo_estimado_min || 0), 0);

    return (
      <DocumentPrintBase
        ref={ref}
        title="ROTA DE LUBRIFICAÇÃO"
        documentNumber={docNum}
        empresa={empresa}
      >
        {/* Info da Rota */}
        <PrintInfoGrid
          items={[
            { label: 'CÓDIGO', value: rota.codigo, mono: true },
            { label: 'NOME DA ROTA', value: rota.nome },
            { label: 'FREQUÊNCIA', value: FREQ_LABEL[rota.frequencia] || rota.frequencia },
            { label: 'TEMPO TOTAL', value: formatMin(tempoTotal) },
          ]}
        />

        <PrintInfoGrid
          items={[
            { label: 'RESPONSÁVEL', value: rota.responsavel || '—' },
            { label: 'DATA EXECUÇÃO', value: format(new Date(), 'dd/MM/yyyy', { locale: ptBR }) },
          ]}
        />

        {rota.descricao && (
          <div className="border-b-2 border-black p-2 text-[9px]">
            <span className="font-bold text-gray-500 text-[8px] block">DESCRIÇÃO</span>
            <span>{rota.descricao}</span>
          </div>
        )}

        {/* Tabela de Pontos */}
        <PrintSectionHeader label="PONTOS DE LUBRIFICAÇÃO" />

        <div className="w-full">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Nº</th>
                <th style={thStyle}>CÓDIGO</th>
                <th style={thStyle}>TAG</th>
                <th style={{ ...thStyle, minWidth: '30mm' }}>DESCRIÇÃO</th>
                <th style={thStyle}>LOCALIZAÇÃO</th>
                <th style={thStyle}>LUBRIFICANTE</th>
                <th style={thStyle}>QTD</th>
                <th style={thStyle}>FERRAMENTA</th>
                <th style={thStyle}>MIN</th>
                <th style={{ ...thStyle, width: '8mm', textAlign: 'center' }}>OK</th>
                <th style={{ ...thStyle, width: '8mm', textAlign: 'center' }}>NOK</th>
                <th style={{ ...thStyle, minWidth: '20mm' }}>OBS</th>
              </tr>
            </thead>
            <tbody>
              {pontos.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ ...tdStyle, textAlign: 'center', padding: '8px', color: '#999' }}>
                    Nenhum ponto cadastrado nesta rota.
                  </td>
                </tr>
              ) : (
                pontos.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{p.codigo_ponto}</td>
                    <td style={tdStyle}>{p.equipamento_tag || '—'}</td>
                    <td style={tdStyle}>{p.descricao}</td>
                    <td style={tdStyle}>{p.localizacao || '—'}</td>
                    <td style={tdStyle}>{p.lubrificante || '—'}</td>
                    <td style={tdStyle}>{p.quantidade || '—'}</td>
                    <td style={tdStyle}>{p.ferramenta || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{p.tempo_estimado_min}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '1px solid black' }}></span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '1px solid black' }}></span>
                    </td>
                    <td style={tdStyle}></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Instruções consolidadas */}
        {pontos.some((p) => p.instrucoes) && (
          <>
            <PrintSectionHeader label="INSTRUÇÕES / RECOMENDAÇÕES" />
            <div className="p-2 text-[8px] border-b-2 border-black space-y-1">
              {pontos.filter((p) => p.instrucoes).map((p, i) => (
                <p key={p.id}>
                  <strong>{p.codigo_ponto}:</strong> {p.instrucoes}
                  {p.referencia_manual && <span className="text-gray-500"> (Ref: {p.referencia_manual})</span>}
                </p>
              ))}
            </div>
          </>
        )}

        {rota.observacoes && (
          <>
            <PrintSectionHeader label="OBSERVAÇÕES DA ROTA" />
            <div className="p-2 text-[9px] border-b-2 border-black">{rota.observacoes}</div>
          </>
        )}

        <PrintTimeRow />
        <PrintExecutorBlock count={2} label="LUBRIFICADOR" />
      </DocumentPrintBase>
    );
  }
);

RotaPrintTemplate.displayName = 'RotaPrintTemplate';

const thStyle: React.CSSProperties = {
  border: '1px solid black',
  padding: '3px 4px',
  fontWeight: 'bold',
  backgroundColor: '#f3f3f3',
  textAlign: 'left',
  fontSize: '7px',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  border: '1px solid black',
  padding: '2px 4px',
  fontSize: '8px',
  verticalAlign: 'top',
};
