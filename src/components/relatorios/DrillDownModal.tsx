import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { OrdemServicoRow } from '@/hooks/useOrdensServico';

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  ordens: OrdemServicoRow[];
}

const statusCores: Record<string, string> = {
  ABERTA: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  AGUARDANDO_MATERIAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  FECHADA: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CANCELADA: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const prioridadeCores: Record<string, string> = {
  URGENTE: 'bg-red-100 text-red-700',
  ALTA: 'bg-orange-100 text-orange-700',
  MEDIA: 'bg-amber-100 text-amber-700',
  BAIXA: 'bg-green-100 text-green-700',
};

export function DrillDownModal({ open, onClose, title, ordens }: DrillDownModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="outline">{ordens.length} OS</Badge>
          </DialogTitle>
        </DialogHeader>

        {ordens.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma OS encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-2 pr-2">Nº OS</th>
                  <th className="pb-2 pr-2">TAG</th>
                  <th className="pb-2 pr-2">Equipamento</th>
                  <th className="pb-2 pr-2">Tipo</th>
                  <th className="pb-2 pr-2">Prioridade</th>
                  <th className="pb-2 pr-2">Status</th>
                  <th className="pb-2 pr-2">Data</th>
                  <th className="pb-2">Problema</th>
                </tr>
              </thead>
              <tbody>
                {ordens.slice(0, 100).map(os => (
                  <tr key={os.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-2 pr-2 font-mono font-semibold">{String(os.numero_os).padStart(6, '0')}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{os.tag}</td>
                    <td className="py-2 pr-2 text-xs max-w-[150px] truncate">{os.equipamento}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className="text-[10px]">{os.tipo}</Badge>
                    </td>
                    <td className="py-2 pr-2">
                      <Badge className={`text-[10px] px-1.5 py-0 ${prioridadeCores[os.prioridade] || ''}`}>{os.prioridade}</Badge>
                    </td>
                    <td className="py-2 pr-2">
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusCores[os.status] || ''}`}>{os.status}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-xs whitespace-nowrap">
                      {os.data_solicitacao ? format(new Date(os.data_solicitacao), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="py-2 text-xs max-w-[200px] truncate text-muted-foreground">{os.problema}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ordens.length > 100 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Exibindo 100 de {ordens.length} registros.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
