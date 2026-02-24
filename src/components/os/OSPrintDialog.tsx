import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { OSPrintTemplate } from './OSPrintTemplate';
import { PrintPreviewDialog } from '@/components/print/PrintPreviewDialog';

interface OSPrintDialogProps {
  os: {
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
}

export function OSPrintDialog({ os, trigger }: OSPrintDialogProps) {
  const { data: empresa } = useDadosEmpresa();
  const docNum = `OS-${String(os.numero_os).padStart(6, '0')}`;

  return (
    <PrintPreviewDialog
      title={`Imprimir Ordem de Serviço — ${docNum}`}
      subtitle="Visualize e imprima a OS para entregar ao técnico"
      documentTitle={docNum}
      trigger={trigger}
    >
      {(ref) => <OSPrintTemplate ref={ref} os={os} empresa={empresa} />}
    </PrintPreviewDialog>
  );
}
