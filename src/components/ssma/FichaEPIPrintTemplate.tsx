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
}

export const FichaEPIPrintTemplate = forwardRef<HTMLDivElement, Props>(
  ({ colaboradorNome, colaboradorFuncao, colaboradorSetor, colaboradorMatricula, entregas, empresa, responsavelEntrega }, ref) => {
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const displayName = empresa?.nome_fantasia || empresa?.razao_social || 'EMPRESA';
    const logoUrl = empresa?.logo_os_url || empresa?.logo_url || '';
    const linhasMinimas = 10;
    const linhasEmBranco = Math.max(0, linhasMinimas - entregas.length);

    return (
      <div
        ref={ref}
        className="bg-white text-black w-[297mm] min-h-[210mm] mx-auto"
        style={{ fontFamily: "'Arial', 'Helvetica Neue', sans-serif", fontSize: '9px', padding: '6mm', lineHeight: 1.25 }}
      >
        <style>{`
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          @media print {
            html, body {
              width: 297mm;
              height: 210mm;
            }
            .print-no-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}</style>

        <div className="border-2 border-black h-full">
          {/* ═══ CABEÇALHO ═══ */}
          <div className="flex border-b-2 border-black print-no-break">
            <div className="w-[32mm] border-r-2 border-black p-2 flex items-center justify-center bg-white">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-[20mm] max-w-[28mm] object-contain" />
              ) : (
                <div className="text-[8px] text-gray-400 text-center font-bold">LOGO</div>
              )}
            </div>
            <div className="flex-1 text-center py-2.5 flex flex-col justify-center">
              <p className="text-[9px] font-bold tracking-widest text-gray-600">{displayName.toUpperCase()}</p>
              <h1 className="text-[15px] font-black tracking-tight mt-0.5">FICHA DE CONTROLE E RESPONSABILIDADE DE EPI</h1>
              <p className="text-[8px] text-gray-500 mt-0.5">Modelo padronizado para registro e assinatura de colaborador - NR-06</p>
            </div>
            <div className="w-[60mm] border-l-2 border-black text-[8.5px]">
              <div className="border-b border-black p-1.5 flex justify-between items-center">
                <span className="font-bold">Documento:</span>
                <span className="font-black">FEPI-ISO-001</span>
              </div>
              <div className="border-b border-black p-1.5 flex justify-between items-center">
                <span className="font-bold">Revisão:</span>
                <span>Rev. 01</span>
              </div>
              <div className="border-b border-black p-1.5 flex justify-between items-center">
                <span className="font-bold">Emissão:</span>
                <span>{hoje}</span>
              </div>
              <div className="p-1.5 flex justify-between items-center">
                <span className="font-bold">CNPJ:</span>
                <span>{empresa?.cnpj || '________________'}</span>
              </div>
            </div>
          </div>

          {/* ═══ DADOS DO COLABORADOR ═══ */}
          <div className="border-b-2 border-black print-no-break">
            <div className="bg-gray-100 px-3 py-1 border-b border-black">
              <span className="font-bold text-[9px] tracking-wider">IDENTIFICAÇÃO DO COLABORADOR</span>
            </div>
            <div className="grid grid-cols-4 gap-0">
              <div className="border-r border-black p-2">
                <span className="text-[8px] text-gray-500 block">Nome Completo</span>
                <span className="font-bold text-[11px]">{colaboradorNome}</span>
              </div>
              <div className="border-r border-black p-2">
                <span className="text-[8px] text-gray-500 block">Matrícula</span>
                <span className="font-bold text-[11px]">{colaboradorMatricula || '_______________'}</span>
              </div>
              <div className="border-r border-black p-2">
                <span className="text-[8px] text-gray-500 block">Função / Cargo</span>
                <span className="font-bold text-[11px]">{colaboradorFuncao || '_______________'}</span>
              </div>
              <div className="p-2">
                <span className="text-[8px] text-gray-500 block">Setor / Departamento</span>
                <span className="font-bold text-[11px]">{colaboradorSetor || '_______________'}</span>
              </div>
            </div>
          </div>

          {/* ═══ TABELA DE ENTREGAS ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 px-3 py-1 border-b border-black">
              <span className="font-bold text-[9px] tracking-wider">REGISTRO DE ENTREGA / DEVOLUÇÃO DE EPIs</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '8mm' }}>#</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>EPI / Especificação</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '18mm' }}>Nº CA</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '12mm' }}>Qtd</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '22mm' }}>Entrega</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '22mm' }}>Devolução</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left', fontWeight: 'bold', width: '75mm' }}>Observações / Anotações Manuais</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '24mm' }}>Rubrica</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((ent, index) => (
                  <tr key={ent.id}>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace', height: '9mm' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>{ent.epi?.nome || '—'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace', height: '9mm' }}>{ent.epi?.numero_ca || '—'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace', height: '9mm' }}>{ent.quantidade}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', height: '9mm' }}>
                      {new Date(ent.data_entrega).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', height: '9mm' }}>
                      {ent.data_devolucao ? new Date(ent.data_devolucao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>{ent.motivo || ent.observacoes || '—'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                  </tr>
                ))}
                {/* Linhas em branco para preenchimento manual */}
                {Array.from({ length: linhasEmBranco }).map((_, i) => (
                  <tr key={`blank-${i}`}>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', height: '9mm' }}>{entregas.length + i + 1}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', height: '9mm' }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-b-2 border-black print-no-break">
            <div className="bg-gray-100 px-3 py-1 border-b border-black">
              <span className="font-bold text-[9px] tracking-wider">ANOTAÇÕES COMPLEMENTARES (USO MANUAL)</span>
            </div>
            <div className="p-2.5">
              <div className="border border-dashed border-gray-500 min-h-[26mm]" />
            </div>
          </div>

          {/* ═══ TERMO DE RESPONSABILIDADE ═══ */}
          <div className="border-b-2 border-black print-no-break">
            <div className="bg-gray-100 px-3 py-1 border-b border-black">
              <span className="font-bold text-[9px] tracking-wider">TERMO DE RESPONSABILIDADE — NR-06</span>
            </div>
            <div className="p-2.5 text-[8px] text-justify leading-relaxed">
              <p>
                Declaro que recebi os EPIs descritos nesta ficha e estou ciente das obrigações da NR-06 quanto ao uso correto, conservação e comunicação imediata de dano, perda ou inadequação do equipamento.
              </p>
              <p className="mt-1">
                Estou ciente de que o uso inadequado ou a recusa injustificada poderá gerar medidas disciplinares, conforme legislação trabalhista e normas internas da empresa.
              </p>
            </div>
          </div>

          {/* ═══ ASSINATURAS ═══ */}
          <div className="grid grid-cols-3 print-no-break">
            <div className="border-r border-black p-3 text-center">
              <div style={{ borderTop: '1px solid black', marginTop: '22px', paddingTop: '4px' }}>
                <p className="text-[9px] font-bold">{colaboradorNome}</p>
                <p className="text-[8px] text-gray-600">Assinatura do Colaborador</p>
              </div>
            </div>
            <div className="border-r border-black p-3 text-center">
              <div style={{ borderTop: '1px solid black', marginTop: '22px', paddingTop: '4px' }}>
                <p className="text-[9px] font-bold">{responsavelEntrega || '_______________________'}</p>
                <p className="text-[8px] text-gray-600">Responsável pela Entrega / SESMT</p>
              </div>
            </div>
            <div className="p-3 text-center">
              <div style={{ borderTop: '1px solid black', marginTop: '22px', paddingTop: '4px' }}>
                <p className="text-[9px] font-bold">_______________________</p>
                <p className="text-[8px] text-gray-600">Gestor / Testemunha</p>
              </div>
            </div>
          </div>

          {/* ═══ RODAPÉ ═══ */}
          <div className="border-t-2 border-black bg-gray-50 px-3 py-1 text-[7px] text-gray-500 flex justify-between">
            <span>{displayName} - Documento controlado pelo SESMT</span>
            <span>Gerado em {hoje} - PCM Estrategico</span>
          </div>
        </div>
      </div>
    );
  }
);

FichaEPIPrintTemplate.displayName = 'FichaEPIPrintTemplate';
