import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Eye } from 'lucide-react';
import { OSPrintTemplate } from './OSPrintTemplate';

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
  const [open, setOpen] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('MANUTENÇÃO INDUSTRIAL');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `OS_${String(os.numero_os).padStart(4, '0')}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Ordem de Serviço #{String(os.numero_os).padStart(4, '0')}
          </DialogTitle>
          <DialogDescription>
            Visualize e imprima a OS para entregar ao mecânico
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Config */}
          <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-2">
              <Label htmlFor="empresa">Nome da Empresa (cabeçalho)</Label>
              <Input
                id="empresa"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
            <Button onClick={() => handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>

          {/* Preview */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Pré-visualização</span>
            </div>
            <div className="overflow-auto max-h-[500px] bg-gray-100 p-4">
              <div className="transform scale-[0.6] origin-top-left" style={{ width: '166.67%' }}>
                <OSPrintTemplate ref={printRef} os={os} nomeEmpresa={nomeEmpresa} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
