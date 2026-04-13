import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { supabase } from '@/integrations/supabase/client';
import { getSolicitacoesTable } from '@/hooks/useSolicitacoes';
import { useAuth } from '@/contexts/AuthContext';
import { OSPrintTemplate } from './OSPrintTemplate';
import { PRINT_PAGE_STYLE } from '@/components/print/DocumentPrintBase';
import { useRegistrarImpressao } from '@/hooks/useOSImpressoes';

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
  const { tenantId } = useAuth();
  const [resolvedSolNum, setResolvedSolNum] = useState<number | null>(null);
  const [servicoExecutado, setServicoExecutado] = useState<string | null>(null);
  const docNum = `OS-${String(os.numero_os).padStart(6, '0')}`;
  const printRef = useRef<HTMLDivElement>(null);
  const registrarImpressao = useRegistrarImpressao();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: docNum,
    pageStyle: PRINT_PAGE_STYLE,
    onAfterPrint: () => {
      if (os.id) {
        registrarImpressao.mutate({ osId: os.id });
      }
    },
  });

  useEffect(() => {
    if (solicitacaoNumeroProp != null) { setResolvedSolNum(solicitacaoNumeroProp); return; }
    if (!os.id || !tenantId) { setResolvedSolNum(null); return; }
    const osId = os.id;
    void (async () => {
      const table = await getSolicitacoesTable();
      const { data } = await (supabase
        .from(table as any)
        .select('numero_solicitacao')
        .eq('os_id', osId)
        .eq('empresa_id', tenantId)
        .limit(1)
        .maybeSingle() as any) as { data: { numero_solicitacao?: number } | null };
      setResolvedSolNum(data ? Number(data.numero_solicitacao ?? 0) || null : null);
    })();
  }, [os.id, solicitacaoNumeroProp, tenantId]);

  useEffect(() => {
    if (!os.id || !tenantId) { setServicoExecutado(null); return; }
    supabase.from('execucoes_os').select('servico_executado').eq('os_id', os.id).eq('empresa_id', tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: { data: { servico_executado: string | null } | null }) => { setServicoExecutado(data ? data.servico_executado : null); });
  }, [os.id, tenantId]);

  return (
    <>
      {trigger ? React.cloneElement(trigger as React.ReactElement, { onClick: () => handlePrint() }) : null}
      <div style={{ display: 'none' }}>
        <OSPrintTemplate ref={printRef} os={os} empresa={empresa} solicitacaoNumero={resolvedSolNum} servicoExecutado={servicoExecutado} />
      </div>
    </>
  );
}
