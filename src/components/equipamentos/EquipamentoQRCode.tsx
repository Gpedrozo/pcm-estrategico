import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer, QrCode } from 'lucide-react';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';

interface EquipamentoQRCodeDialogProps {
  equipamento: EquipamentoRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipamentoQRCodeDialog({ equipamento, open, onOpenChange }: EquipamentoQRCodeDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const qrValue = `${window.location.origin}/equipamentos?tag=${encodeURIComponent(equipamento.tag)}`;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `QRCode_${equipamento.tag}`,
    pageStyle: `
      @page { size: 80mm 60mm; margin: 4mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code — {equipamento.tag}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Preview / Print area */}
          <div
            ref={printRef}
            className="bg-white p-4 rounded-lg border flex flex-col items-center gap-3"
            style={{ width: '280px' }}
          >
            <QRCodeSVG
              value={qrValue}
              size={180}
              level="H"
              includeMargin
            />
            <div className="text-center">
              <p className="font-mono font-bold text-lg text-black">{equipamento.tag}</p>
              <p className="text-xs text-gray-600 max-w-[240px] truncate">{equipamento.nome}</p>
              {equipamento.localizacao && (
                <p className="text-[10px] text-gray-400 mt-0.5">{equipamento.localizacao}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button onClick={() => handlePrint()} className="flex-1 gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Etiqueta
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
