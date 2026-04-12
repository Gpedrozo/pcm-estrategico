import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FichaSegurancaRow } from '@/hooks/useFichasSeguranca';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';

// Mapa de pictogramas GHS por keyword na classificação
const GHS_SYMBOLS: Record<string, string> = {
  'inflamável': '🔥',
  'inflamavel': '🔥',
  'tóxico': '☠️',
  'toxico': '☠️',
  'corrosivo': '⚗️',
  'oxidante': '🔆',
  'explosivo': '💥',
  'irritante': '⚠️',
  'nocivo': '⚠️',
  'ambiental': '🌿',
};

function getGHSSymbols(classificacao: string | null): string[] {
  if (!classificacao) return [];
  const lower = classificacao.toLowerCase();
  return Object.entries(GHS_SYMBOLS)
    .filter(([key]) => lower.includes(key))
    .map(([, sym]) => sym);
}

interface Props {
  ficha: FichaSegurancaRow;
  empresa?: DadosEmpresa | null;
}

export const FISPQPrintTemplate = forwardRef<HTMLDivElement, Props>(({ ficha, empresa }, ref) => {
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const displayName = empresa?.nome_fantasia || empresa?.razao_social || 'EMPRESA';
  const logoUrl = empresa?.logo_os_url || empresa?.logo_url || '';
  const ghsSymbols = getGHSSymbols(ficha.classificacao_ghs);

  return (
    <div
      ref={ref}
      className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto"
      style={{ fontFamily: "'Arial', 'Helvetica Neue', sans-serif", fontSize: '10px', padding: '8mm', lineHeight: 1.5 }}
    >
      <div className="border-2 border-black">
        {/* ═══ CABEÇALHO ═══ */}
        <div className="flex border-b-2 border-black">
          <div className="w-[25mm] border-r-2 border-black p-2 flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-[18mm] max-w-[22mm] object-contain" />
            ) : (
              <div className="text-[8px] text-gray-400 text-center font-bold">LOGO</div>
            )}
          </div>
          <div className="flex-1 text-center py-2 flex flex-col justify-center">
            <p className="text-[8px] font-bold tracking-widest text-gray-600">{displayName.toUpperCase()}</p>
            <h1 className="text-[15px] font-black tracking-tight mt-0.5">FICHA DE INFORMAÇÕES DE SEGURANÇA</h1>
            <p className="text-[9px] font-bold mt-0.5">FISPQ / FDS — GHS / ABNT NBR 14725</p>
          </div>
          <div className="w-[48mm] border-l-2 border-black text-[9px]">
            <div className="border-b border-black p-1.5 flex justify-between">
              <span className="font-bold">Código:</span>
              <span className="font-black">{ficha.codigo || '—'}</span>
            </div>
            <div className="border-b border-black p-1.5 flex justify-between">
              <span className="font-bold">Emissão:</span>
              <span>{hoje}</span>
            </div>
            <div className="border-b border-black p-1.5 flex justify-between">
              <span className="font-bold">Validade:</span>
              <span>{ficha.data_validade ? new Date(ficha.data_validade).toLocaleDateString('pt-BR') : 'N/A'}</span>
            </div>
            <div className="p-1.5 flex justify-between">
              <span className="font-bold">Status:</span>
              <span className={ficha.ativo ? 'font-bold text-green-700' : 'font-bold text-red-700'}>
                {ficha.ativo ? 'ATIVA' : 'INATIVA'}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ SEÇÃO 1 — IDENTIFICAÇÃO ═══ */}
        <div className="border-b border-black">
          <div className="bg-gray-800 text-white px-3 py-1">
            <span className="font-bold text-[9px] tracking-wider">SEÇÃO 1 — IDENTIFICAÇÃO DO PRODUTO E DA EMPRESA</span>
          </div>
          <div className="grid grid-cols-2 gap-0">
            <div className="border-r border-black p-2">
              <span className="text-[8px] text-gray-500 block font-bold">Nome do Produto</span>
              <span className="font-black text-[13px]">{ficha.nome_produto}</span>
            </div>
            <div className="p-2">
              <span className="text-[8px] text-gray-500 block font-bold">Fabricante / Fornecedor</span>
              <span className="font-bold text-[11px]">{ficha.fabricante || '—'}</span>
            </div>
          </div>
        </div>

        {/* ═══ SEÇÃO 2 — IDENTIFICAÇÃO DE PERIGOS ═══ */}
        <div className="border-b border-black">
          <div className="bg-gray-800 text-white px-3 py-1">
            <span className="font-bold text-[9px] tracking-wider">SEÇÃO 2 — IDENTIFICAÇÃO DE PERIGOS (GHS)</span>
          </div>
          <div className="p-2 flex items-start gap-4">
            {ghsSymbols.length > 0 && (
              <div className="flex gap-2 shrink-0">
                {ghsSymbols.map((sym, i) => (
                  <span key={i} className="text-[24px]">{sym}</span>
                ))}
              </div>
            )}
            <div>
              <span className="text-[8px] text-gray-500 font-bold block">Classificação GHS / Palavra de Advertência</span>
              <span className="font-bold text-[10px]">{ficha.classificacao_ghs || 'Consulte a FISPQ original para classificação GHS completa.'}</span>
              {ficha.perigos_principais && (
                <div className="mt-1">
                  <span className="text-[8px] text-gray-500 font-bold block">Principais Perigos</span>
                  <span className="text-[9px]">{ficha.perigos_principais}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SEÇÃO 4 — PRIMEIROS SOCORROS ═══ */}
        {ficha.primeiros_socorros && (
          <div className="border-b border-black">
            <div className="bg-red-700 text-white px-3 py-1">
              <span className="font-bold text-[9px] tracking-wider">SEÇÃO 4 — MEDIDAS DE PRIMEIROS SOCORROS</span>
            </div>
            <div className="p-2">
              <p className="text-[9px] whitespace-pre-wrap">{ficha.primeiros_socorros}</p>
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO 6 — MEDIDAS DE EMERGÊNCIA ═══ */}
        {ficha.medidas_emergencia && (
          <div className="border-b border-black">
            <div className="bg-orange-700 text-white px-3 py-1">
              <span className="font-bold text-[9px] tracking-wider">SEÇÃO 6 — MEDIDAS EM CASO DE VAZAMENTO / EMERGÊNCIA</span>
            </div>
            <div className="p-2">
              <p className="text-[9px] whitespace-pre-wrap">{ficha.medidas_emergencia}</p>
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO 7 — ARMAZENAMENTO ═══ */}
        {ficha.armazenamento && (
          <div className="border-b border-black">
            <div className="bg-blue-700 text-white px-3 py-1">
              <span className="font-bold text-[9px] tracking-wider">SEÇÃO 7 — MANUSEIO E ARMAZENAMENTO</span>
            </div>
            <div className="p-2">
              <p className="text-[9px] whitespace-pre-wrap">{ficha.armazenamento}</p>
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO 8 — EPI ═══ */}
        {ficha.epi_recomendado && (
          <div className="border-b border-black">
            <div className="bg-yellow-700 text-white px-3 py-1">
              <span className="font-bold text-[9px] tracking-wider">SEÇÃO 8 — CONTROLES DE EXPOSIÇÃO / EPI RECOMENDADO</span>
            </div>
            <div className="p-2">
              <p className="text-[9px] whitespace-pre-wrap">{ficha.epi_recomendado}</p>
            </div>
          </div>
        )}

        {/* ═══ AVISO LEGAL ═══ */}
        <div className="border-b border-black bg-yellow-50 p-2">
          <p className="text-[7.5px] text-gray-600 text-justify">
            <strong>⚠️ AVISO:</strong> Este documento é um resumo das informações de segurança. Para informações completas, consulte a FISPQ original fornecida pelo fabricante.
            As informações aqui contidas são baseadas nos dados cadastrados no sistema PCM Estratégico e podem não refletir a versão mais recente da FISPQ.
            Em caso de emergência, ligue para o <strong>CIPA/SESMT da empresa</strong> ou <strong>SAMU: 192</strong>.
          </p>
        </div>

        {/* ═══ RODAPÉ ═══ */}
        <div className="bg-gray-50 px-3 py-1 text-[7px] text-gray-500 flex justify-between">
          <span>{displayName} — SSMA · FISPQ: {ficha.codigo || ficha.id.slice(0, 8).toUpperCase()}</span>
          <span>Gerado em {hoje} · PCM Estratégico v1.0</span>
        </div>
      </div>
    </div>
  );
});

FISPQPrintTemplate.displayName = 'FISPQPrintTemplate';
