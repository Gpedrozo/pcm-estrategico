import { useEffect, useState } from 'react';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { supabase } from '@/integrations/supabase/client';
import { OSPrintTemplate } from './OSPrintTemplate';
import { PrintPreviewDialog } from '@/components/print/PrintPreviewDialog';

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
  const docNum = `OS-${String(os.numero_os).padStart(6, '0')}`;

  useEffect(() => {
    if (solicitacaoNumeroProp != null) { setResolvedSolNum(solicitacaoNumeroProp); return; }
    if (!os.id) { setResolvedSolNum(null); return; }
    supabase.from('solicitacoes_manutencao').select('numero_solicitacao').eq('os_id', os.id).limit(1).single()
      .then(({ data }) => { setResolvedSolNum(data ? (data as { numero_solicitacao: number }).numero_solicitacao : null); });
  }, [os.id, solicitacaoNumeroProp]);

  return (
    <PrintPreviewDialog
      title={`Imprimir Ordem de Serviço — ${docNum}`}
      subtitle="Visualize e imprima a OS para entregar ao técnico"
      documentTitle={docNum}
      trigger={trigger}
    >
      {(ref) => <OSPrintTemplate ref={ref} os={os} empresa={empresa} solicitacaoNumero={resolvedSolNum} />}
    </PrintPreviewDialog>
  );
}
