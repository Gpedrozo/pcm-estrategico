import { forwardRef, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';

export interface DocumentPrintBaseProps {
  /** Document title, e.g. "ORDEM DE SERVIÇO" */
  title: string;
  /** Document number, e.g. "OS-000001" */
  documentNumber: string;
  /** Company data from dados_empresa */
  empresa?: DadosEmpresa | null;
  /** Layout version string */
  layoutVersion?: string;
  /** Override emission date */
  emissionDate?: string;
  /** Current page / total pages (for multi-page) */
  page?: string;
  /** Main content */
  children: ReactNode;
  /** Optional content after signatures (before footer) */
  footer?: ReactNode;
}

export const DocumentPrintBase = forwardRef<HTMLDivElement, DocumentPrintBaseProps>(
  ({ title, documentNumber, empresa, layoutVersion = '1.0', emissionDate, page = '1 / 1', children, footer }, ref) => {
    const dataEmissao = emissionDate || format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    const displayName = empresa?.nome_fantasia || empresa?.razao_social || 'MANUTENÇÃO INDUSTRIAL';
    const logoUrl = empresa?.logo_os_url || empresa?.logo_pdf_url || empresa?.logo_principal_url || '';

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
                <div className="text-[8px] text-gray-400 text-center font-bold">LOGO</div>
              )}
            </div>
            <div className="flex-1 text-center py-2 flex flex-col justify-center">
              <p className="text-[9px] font-bold tracking-widest text-gray-600">{displayName?.toUpperCase()}</p>
              <h1 className="text-[16px] font-black tracking-tight mt-0.5">{title}</h1>
            </div>
            <div className="w-[48mm] border-l-2 border-black text-[9px]">
              <div className="border-b border-black p-1.5 flex justify-between">
                <span className="font-bold">Nº Documento:</span>
                <span className="font-black text-[12px]">{documentNumber}</span>
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
                <span>{page}</span>
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

          {/* ═══ CONTENT ═══ */}
          {children}

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
          <span>Página {page} • Versão {layoutVersion} • Emitido em {dataEmissao}</span>
        </div>

        {footer}
      </div>
    );
  }
);

DocumentPrintBase.displayName = 'DocumentPrintBase';

/* ═══ REUSABLE PRINT SECTIONS ═══ */

export function PrintSectionHeader({ label }: { label: string }) {
  return (
    <div className="bg-gray-100 p-2 font-bold text-[9px] border-b border-black tracking-wider">
      {label}
    </div>
  );
}

export function PrintInfoGrid({ items }: { items: { label: string; value: string; mono?: boolean }[] }) {
  return (
    <div className={`grid grid-cols-${Math.min(items.length, 4)} border-b-2 border-black text-[9px]`}>
      {items.map((item, i) => (
        <div key={i} className={`p-2 ${i < items.length - 1 ? 'border-r border-black' : ''}`}>
          <span className="font-bold text-gray-500 text-[8px] block">{item.label}</span>
          <span className={`font-semibold ${item.mono ? 'font-mono font-black text-[11px]' : ''}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PrintBlankLines({ count = 3 }: { count?: number }) {
  return (
    <div className="p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-dashed border-gray-300 h-5"></div>
      ))}
    </div>
  );
}

export function PrintTimeRow() {
  return (
    <div className="grid grid-cols-3 border-b-2 border-black text-[9px]">
      {['HORA INÍCIO', 'HORA FIM', 'TEMPO TOTAL'].map((label, i) => (
        <div key={label} className={`p-2 ${i < 2 ? 'border-r border-black' : ''}`}>
          <span className="font-bold text-gray-500 text-[8px]">{label}:</span>
          <div className="h-5 mt-1 border-b border-dashed border-gray-400"></div>
        </div>
      ))}
    </div>
  );
}

export function PrintStatusCheckboxes() {
  return (
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
  );
}

export function PrintExecutorBlock({ count = 2, label = 'MANUTENTOR' }: { count?: number; label?: string }) {
  return (
    <div className="grid grid-cols-2 border-b-2 border-black text-[9px]">
      {Array.from({ length: count }).map((_, n) => (
        <div key={n} className={n === 0 ? 'border-r-2 border-black' : ''}>
          <div className="bg-gray-100 p-2 font-bold border-b border-black tracking-wider text-[9px]">{label} {n + 1}</div>
          <div className="p-2 h-7 border-b border-black"></div>
          <div className="grid grid-cols-2">
            <div className="border-r border-black p-1.5"><span className="font-bold">Assinatura:</span></div>
            <div className="p-1.5"><span className="font-bold">Data:</span> ___/___/______</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Standard print page styles for react-to-print */
export const PRINT_PAGE_STYLE = `
  @page { size: A4; margin: 0; }
  @media print {
    html, body { margin: 0; padding: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
