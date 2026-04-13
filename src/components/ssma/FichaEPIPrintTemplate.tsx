import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EPIRow, EntregaEPIRow } from '@/hooks/useEPIs';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';

interface Props {
  colaboradorNome: string;
  colaboradorFuncao?: string;
  colaboradorSetor?: string;
  colaboradorMatricula?: string;
  entregas: (EntregaEPIRow & { epi?: EPIRow })[];
  empresa?: DadosEmpresa | null;
  responsavelEntrega?: string;
  /** Quando true, exibe layout compacto para primeira entrega */
  primeiraEntrega?: boolean;
}

export const FichaEPIPrintTemplate = forwardRef<HTMLDivElement, Props>(
  ({ colaboradorNome, colaboradorFuncao, colaboradorSetor, colaboradorMatricula, entregas, empresa, responsavelEntrega, primeiraEntrega = true }, ref) => {
    const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const hojeExtenso = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const displayName = empresa?.nome_fantasia || empresa?.razao_social || 'EMPRESA';
    const logoUrl = empresa?.logo_os_url || empresa?.logo_url || '';
    // Single-page: máximo 8 EPIs com dados + linhas em branco para completar
    const maxLinhas = primeiraEntrega ? 8 : 12;
    const linhasEmBranco = Math.max(0, maxLinhas - entregas.length);

    const cellBase: React.CSSProperties = { border: '1px solid #374151', padding: '3px 5px', height: '7.5mm' };
    const cellCenter: React.CSSProperties = { ...cellBase, textAlign: 'center' };
    const cellMono: React.CSSProperties = { ...cellCenter, fontFamily: 'monospace' };

    return (
      <div
        ref={ref}
        className="bg-white text-black"
        style={{ fontFamily: "'Arial', 'Helvetica Neue', sans-serif", fontSize: '8.5px', width: '210mm', height: '297mm', padding: '5mm', lineHeight: 1.2, boxSizing: 'border-box' }}
      >
        <style>{`
          @page { size: A4 portrait; margin: 5mm; }
          @media print {
            html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
            .print-no-break { page-break-inside: avoid; break-inside: avoid; }
          }
        `}</style>

        <div style={{ border: '2px solid black', height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* ═══ CABEÇALHO ═══ */}
          <div style={{ display: 'flex', borderBottom: '2px solid black' }} className="print-no-break">
            <div style={{ width: '28mm', borderRight: '2px solid black', padding: '2mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ maxHeight: '16mm', maxWidth: '24mm', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '7px', color: '#9ca3af', fontWeight: 'bold' }}>LOGO</span>
              )}
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '2mm 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p style={{ fontSize: '8px', fontWeight: 'bold', letterSpacing: '2px', color: '#4b5563' }}>{displayName.toUpperCase()}</p>
              <p style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '-0.3px', marginTop: '1px' }}>
                FICHA DE CONTROLE E RESPONSABILIDADE DE EPI
              </p>
              <p style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}>
                {primeiraEntrega ? 'Primeira Entrega — Documento para assinatura do colaborador — NR-06' : 'Controle contínuo — NR-06'}
              </p>
            </div>
            <div style={{ width: '42mm', borderLeft: '2px solid black', fontSize: '7.5px' }}>
              <div style={{ borderBottom: '1px solid black', padding: '1.5mm 2mm', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>Doc:</span><span style={{ fontWeight: 900 }}>FEPI-001</span>
              </div>
              <div style={{ borderBottom: '1px solid black', padding: '1.5mm 2mm', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>Rev:</span><span>01</span>
              </div>
              <div style={{ borderBottom: '1px solid black', padding: '1.5mm 2mm', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>Emissão:</span><span>{hoje}</span>
              </div>
              <div style={{ padding: '1.5mm 2mm', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>CNPJ:</span><span>{empresa?.cnpj || '_______________'}</span>
              </div>
            </div>
          </div>

          {/* ═══ DADOS DO COLABORADOR ═══ */}
          <div style={{ borderBottom: '2px solid black' }} className="print-no-break">
            <div style={{ background: '#f3f4f6', padding: '1mm 3mm', borderBottom: '1px solid black' }}>
              <span style={{ fontWeight: 'bold', fontSize: '8px', letterSpacing: '1px' }}>IDENTIFICAÇÃO DO COLABORADOR</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ borderRight: '1px solid black', borderBottom: '1px solid black', padding: '1.5mm 2.5mm' }}>
                <span style={{ fontSize: '7px', color: '#6b7280', display: 'block' }}>Nome Completo</span>
                <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{colaboradorNome}</span>
              </div>
              <div style={{ borderBottom: '1px solid black', padding: '1.5mm 2.5mm' }}>
                <span style={{ fontSize: '7px', color: '#6b7280', display: 'block' }}>Matrícula</span>
                <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{colaboradorMatricula || '_______________'}</span>
              </div>
              <div style={{ borderRight: '1px solid black', padding: '1.5mm 2.5mm' }}>
                <span style={{ fontSize: '7px', color: '#6b7280', display: 'block' }}>Função / Cargo</span>
                <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{colaboradorFuncao || '_______________'}</span>
              </div>
              <div style={{ padding: '1.5mm 2.5mm' }}>
                <span style={{ fontSize: '7px', color: '#6b7280', display: 'block' }}>Setor / Departamento</span>
                <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{colaboradorSetor || '_______________'}</span>
              </div>
            </div>
          </div>

          {/* ═══ TABELA DE ENTREGAS ═══ */}
          <div style={{ borderBottom: '2px solid black', flex: 1 }}>
            <div style={{ background: '#f3f4f6', padding: '1mm 3mm', borderBottom: '1px solid black' }}>
              <span style={{ fontWeight: 'bold', fontSize: '8px', letterSpacing: '1px' }}>REGISTRO DE ENTREGA / DEVOLUÇÃO DE EPIs</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ ...cellCenter, width: '6mm', fontWeight: 'bold' }}>#</th>
                  <th style={{ ...cellBase, fontWeight: 'bold', textAlign: 'left' }}>EPI / Descrição</th>
                  <th style={{ ...cellCenter, width: '16mm', fontWeight: 'bold' }}>Nº CA</th>
                  <th style={{ ...cellCenter, width: '10mm', fontWeight: 'bold' }}>Qtd</th>
                  <th style={{ ...cellCenter, width: '18mm', fontWeight: 'bold' }}>Entrega</th>
                  <th style={{ ...cellCenter, width: '18mm', fontWeight: 'bold' }}>Devolução</th>
                  <th style={{ ...cellBase, fontWeight: 'bold', textAlign: 'left', width: '50mm' }}>Motivo / Obs.</th>
                  <th style={{ ...cellCenter, width: '22mm', fontWeight: 'bold' }}>Rubrica</th>
                </tr>
              </thead>
              <tbody>
                {entregas.slice(0, maxLinhas).map((ent, idx) => (
                  <tr key={ent.id}>
                    <td style={cellMono}>{idx + 1}</td>
                    <td style={cellBase}>{ent.epi?.nome || '—'}</td>
                    <td style={cellMono}>{ent.epi?.numero_ca || '—'}</td>
                    <td style={cellMono}>{ent.quantidade}</td>
                    <td style={cellCenter}>{new Date(ent.data_entrega).toLocaleDateString('pt-BR')}</td>
                    <td style={cellCenter}>{ent.data_devolucao ? new Date(ent.data_devolucao).toLocaleDateString('pt-BR') : ''}</td>
                    <td style={cellBase}>{ent.motivo || ent.observacoes || ''}</td>
                    <td style={cellCenter}>&nbsp;</td>
                  </tr>
                ))}
                {Array.from({ length: linhasEmBranco }).map((_, i) => (
                  <tr key={`b-${i}`}>
                    <td style={cellMono}>{entregas.length + i + 1}</td>
                    <td style={cellBase}>&nbsp;</td>
                    <td style={cellBase}>&nbsp;</td>
                    <td style={cellBase}>&nbsp;</td>
                    <td style={cellBase}>&nbsp;</td>
                    <td style={cellBase}>&nbsp;</td>
                    <td style={cellBase}>&nbsp;</td>
                    <td style={cellBase}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ TERMO NR-06 COMPACTO ═══ */}
          <div style={{ borderBottom: '2px solid black' }} className="print-no-break">
            <div style={{ background: '#f3f4f6', padding: '1mm 3mm', borderBottom: '1px solid black' }}>
              <span style={{ fontWeight: 'bold', fontSize: '8px', letterSpacing: '1px' }}>TERMO DE RESPONSABILIDADE — NR-06</span>
            </div>
            <div style={{ padding: '2mm 3mm', fontSize: '7.5px', textAlign: 'justify', lineHeight: 1.35 }}>
              <p>
                Declaro que recebi os Equipamentos de Proteção Individual (EPIs) acima descritos, em perfeito estado de conservação, e comprometo-me a:
                <strong> (a)</strong> utilizá-los apenas para a finalidade a que se destinam;
                <strong> (b)</strong> responsabilizar-me pela guarda e conservação;
                <strong> (c)</strong> comunicar imediatamente qualquer alteração que os torne impróprios para uso;
                <strong> (d)</strong> devolvê-los quando danificados, substituídos ou ao término do contrato de trabalho.
              </p>
              <p style={{ marginTop: '1mm' }}>
                Estou ciente de que o uso é obrigatório e que a recusa injustificada ou uso inadequado sujeitam-me às penalidades previstas na legislação trabalhista e normas internas.
              </p>
            </div>
          </div>

          {/* ═══ ASSINATURAS ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }} className="print-no-break">
            <div style={{ borderRight: '1px solid black', padding: '3mm', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', marginTop: '18mm', paddingTop: '2mm' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 'bold' }}>{colaboradorNome}</p>
                <p style={{ fontSize: '7px', color: '#6b7280' }}>Assinatura do Colaborador</p>
              </div>
            </div>
            <div style={{ borderRight: '1px solid black', padding: '3mm', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', marginTop: '18mm', paddingTop: '2mm' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 'bold' }}>{responsavelEntrega || '_______________________'}</p>
                <p style={{ fontSize: '7px', color: '#6b7280' }}>Responsável Entrega / SESMT</p>
              </div>
            </div>
            <div style={{ padding: '3mm', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', marginTop: '18mm', paddingTop: '2mm' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 'bold' }}>_______________________</p>
                <p style={{ fontSize: '7px', color: '#6b7280' }}>Gestor / Testemunha</p>
              </div>
            </div>
          </div>

          {/* ═══ RODAPÉ ═══ */}
          <div style={{ borderTop: '2px solid black', background: '#f9fafb', padding: '1mm 3mm', fontSize: '6.5px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
            <span>{displayName} — Documento controlado pelo SESMT</span>
            <span>Emitido em {hojeExtenso} — PCM Estratégico</span>
          </div>
        </div>
      </div>
    );
  }
);

FichaEPIPrintTemplate.displayName = 'FichaEPIPrintTemplate';
