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

    return (
      <div
        ref={ref}
        className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto"
        style={{ fontFamily: "'Arial', 'Helvetica Neue', sans-serif", fontSize: '10px', padding: '8mm', lineHeight: 1.4 }}
      >
        <div className="border-2 border-black">
          {/* ═══ CABEÇALHO ═══ */}
          <div className="flex border-b-2 border-black">
            <div className="w-[25mm] border-r-2 border-black p-2 flex items-center justify-center bg-white">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-[18mm] max-w-[22mm] object-contain" />
              ) : (
                <div className="text-[8px] text-gray-400 text-center font-bold">LOGO</div>
              )}
            </div>
            <div className="flex-1 text-center py-2 flex flex-col justify-center">
              <p className="text-[9px] font-bold tracking-widest text-gray-600">{displayName.toUpperCase()}</p>
              <h1 className="text-[15px] font-black tracking-tight mt-0.5">FICHA DE CONTROLE DE EPI</h1>
              <p className="text-[8px] text-gray-500 mt-0.5">Conforme NR-06 — MTE/SIT</p>
            </div>
            <div className="w-[48mm] border-l-2 border-black text-[9px]">
              <div className="border-b border-black p-1.5 flex justify-between">
                <span className="font-bold">Documento:</span>
                <span className="font-black">FEPI-001</span>
              </div>
              <div className="border-b border-black p-1.5 flex justify-between">
                <span className="font-bold">Emissão:</span>
                <span>{hoje}</span>
              </div>
              {empresa?.cnpj && (
                <div className="p-1.5 flex justify-between">
                  <span className="font-bold">CNPJ:</span>
                  <span>{empresa.cnpj}</span>
                </div>
              )}
            </div>
          </div>

          {/* ═══ DADOS DO COLABORADOR ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 px-3 py-1 border-b border-black">
              <span className="font-bold text-[9px] tracking-wider">IDENTIFICAÇÃO DO COLABORADOR</span>
            </div>
            <div className="grid grid-cols-2 gap-0">
              <div className="border-r border-black p-2">
                <span className="text-[8px] text-gray-500 block">Nome Completo</span>
                <span className="font-bold text-[11px]">{colaboradorNome}</span>
              </div>
              <div className="p-2">
                <span className="text-[8px] text-gray-500 block">Matrícula</span>
                <span className="font-bold text-[11px]">{colaboradorMatricula || '_______________'}</span>
              </div>
              <div className="border-r border-t border-black p-2">
                <span className="text-[8px] text-gray-500 block">Função / Cargo</span>
                <span className="font-bold text-[11px]">{colaboradorFuncao || '_______________'}</span>
              </div>
              <div className="border-t border-black p-2">
                <span className="text-[8px] text-gray-500 block">Setor / Departamento</span>
                <span className="font-bold text-[11px]">{colaboradorSetor || '_______________'}</span>
              </div>
            </div>
          </div>

          {/* ═══ TABELA DE ENTREGAS ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 px-3 py-1 border-b border-black">
              <span className="font-bold text-[9px] tracking-wider">HISTÓRICO DE ENTREGA / DEVOLUÇÃO DE EPIs</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Descrição do EPI</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '18mm' }}>Nº CA</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '12mm' }}>Qtd</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '22mm' }}>Data Entrega</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '22mm' }}>Data Devolução</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Motivo / Observação</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', width: '22mm' }}>Assinatura</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((ent) => (
                  <tr key={ent.id}>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px 6px' }}>{ent.epi?.nome || '—'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{ent.epi?.numero_ca || '—'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{ent.quantidade}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px 6px', textAlign: 'center' }}>
                      {new Date(ent.data_entrega).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px 6px', textAlign: 'center' }}>
                      {ent.data_devolucao ? new Date(ent.data_devolucao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px 6px' }}>{ent.motivo || ent.observacoes || '—'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px 6px' }}>&nbsp;</td>
                  </tr>
                ))}
                {/* Linhas em branco para preenchimento manual */}
                {Array.from({ length: Math.max(0, 5 - entregas.length) }).map((_, i) => (
                  <tr key={`blank-${i}`}>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px 6px' }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ TERMO DE RESPONSABILIDADE ═══ */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-100 px-3 py-1 border-b border-black">
              <span className="font-bold text-[9px] tracking-wider">TERMO DE RESPONSABILIDADE — NR-06</span>
            </div>
            <div className="p-3 text-[8.5px] text-justify leading-relaxed">
              <p>
                Declaro que recebi os equipamentos de proteção individual (EPIs) relacionados na tabela acima, que estou ciente das obrigações previstas na Norma Regulamentadora NR-06 e me comprometo a:
              </p>
              <p className="mt-1">
                <strong>(a)</strong> Usar o EPI apenas para a finalidade a que se destina;
                <strong> (b)</strong> Responsabilizar-me por sua guarda e conservação;
                <strong> (c)</strong> Comunicar ao empregador qualquer alteração que o torne impróprio para uso;
                <strong> (d)</strong> Cumprir as determinações do empregador sobre o uso adequado.
              </p>
              <p className="mt-1">
                Estou ciente de que o uso inadequado, a recusa injustificada ou a perda proposital dos EPIs poderá resultar em medida disciplinar, conforme legislação vigente (CLT, Art. 158, Parágrafo único).
              </p>
            </div>
          </div>

          {/* ═══ ASSINATURAS ═══ */}
          <div className="grid grid-cols-2">
            <div className="border-r-2 border-black p-4 text-center">
              <div style={{ borderTop: '1px solid black', marginTop: '32px', paddingTop: '4px' }}>
                <p className="text-[9px] font-bold">{colaboradorNome}</p>
                <p className="text-[8px] text-gray-600">Assinatura do Colaborador</p>
              </div>
            </div>
            <div className="p-4 text-center">
              <div style={{ borderTop: '1px solid black', marginTop: '32px', paddingTop: '4px' }}>
                <p className="text-[9px] font-bold">{responsavelEntrega || '_______________________'}</p>
                <p className="text-[8px] text-gray-600">Responsável pela Entrega / SESMT</p>
              </div>
            </div>
          </div>

          {/* ═══ RODAPÉ ═══ */}
          <div className="border-t-2 border-black bg-gray-50 px-3 py-1 text-[7px] text-gray-500 flex justify-between">
            <span>{displayName} — Documento controlado pelo SESMT</span>
            <span>Gerado em {hoje} · PCM Estratégico</span>
          </div>
        </div>
      </div>
    );
  }
);

FichaEPIPrintTemplate.displayName = 'FichaEPIPrintTemplate';
