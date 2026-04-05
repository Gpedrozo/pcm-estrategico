import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { supabase } from '@/integrations/supabase/client';
import { OSPrintTemplate } from './OSPrintTemplate';
import { PRINT_PAGE_STYLE } from '@/components/print/DocumentPrintBase';

interface OSPrintDialogProps {
  os: {
    id?: string;
    numero_os: number;
    data_solicitacao: string;
    tag: string;
    equipamento: string;
    problema: string;
    solicitante: string;
    tipo: string;
    prioridade: string;
    tempo_estimado?: number | null;
    custo_estimado?: number | null;
  };
  trigger?: React.ReactNode;
  solicitacaoNumero?: number | null;
}

export function OSPrintDialog({ os, trigger, solicitacaoNumero: solicitacaoNumeroProp }: OSPrintDialogProps) {
  const { data: empresa } = useDadosEmpresa();
  const [resolvedSolNum, setResolvedSolNum] = useState<number | null>(null);
  const [servicoExecutado, setServicoExecutado] = useState<string | null>(null);
  const docNum = `OS-${String(os.numero_os).padStart(6, '0')}`;
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: docNum,
    pageStyle: PRINT_PAGE_STYLE,
  });

  useEffect(() => {
    if (solicitacaoNumeroProp != null) { setResolvedSolNum(solicitacaoNumeroProp); return; }
    if (!os.id) { setResolvedSolNum(null); return; }
    // @ts-expect-error — solicitacoes_manutencao not yet in generated types
    supabase.from('solicitacoes_manutencao').select('numero_solicitacao').eq('os_id', os.id).limit(1).single()
      .then(({ data }: { data: { numero_solicitacao: number } | null }) => { setResolvedSolNum(data ? data.numero_solicitacao : null); });
  }, [os.id, solicitacaoNumeroProp]);

  useEffect(() => {
    if (!os.id) { setServicoExecutado(null); return; }
    // @ts-expect-error — execucoes_os not yet in generated types
    supabase.from('execucoes_os').select('servico_executado').eq('ordem_servico_id', os.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: { data: { servico_executado: string | null } | null }) => { setServicoExecutado(data ? data.servico_executado : null); });
  }, [os.id]);

  return (
    <>
      {trigger ? React.cloneElement(trigger as React.ReactElement, { onClick: () => handlePrint() }) : null}
      <div style={{ display: 'none' }}>
        <OSPrintTemplate ref={printRef} os={os} empresa={empresa} solicitacaoNumero={resolvedSolNum} servicoExecutado={servicoExecutado} />
      </div>
    </>
  );
}
