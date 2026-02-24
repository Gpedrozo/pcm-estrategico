import { useRef, useState, type ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Printer, Eye } from 'lucide-react';
import { PRINT_PAGE_STYLE } from './DocumentPrintBase';

interface PrintPreviewDialogProps {
  title: string;
  subtitle?: string;
  documentTitle: string;
  trigger?: ReactNode;
  children: (ref: React.RefObject<HTMLDivElement>) => ReactNode;
}

export function PrintPreviewDialog({ title, subtitle, documentTitle, trigger, children }: PrintPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle,
    pageStyle: PRINT_PAGE_STYLE,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {title}
          </DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 text-sm text-muted-foreground">
              Documento profissional com dados da empresa atualizados automaticamente.
            </div>
            <Button onClick={() => handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Pré-visualização</span>
            </div>
            <div className="overflow-auto max-h-[500px] bg-gray-100 p-4">
              <div className="transform scale-[0.55] origin-top-left" style={{ width: '181.82%' }}>
                {children(printRef)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
