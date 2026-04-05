import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'destructive',
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {pending ? 'Aguarde...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to manage confirm dialog state.
 * Usage:
 *   const { confirm, ConfirmDialogElement } = useConfirmDialog();
 *   ...
 *   <Button onClick={() => confirm({ title: '...', description: '...', onConfirm: () => del(id) })} />
 *   {ConfirmDialogElement}
 */
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void | Promise<void>;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const confirm = useCallback((opts: Omit<typeof state, 'open'>) => {
    setState({ ...opts, open: true });
  }, []);

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel ?? 'Excluir'}
      variant={state.variant ?? 'destructive'}
      onConfirm={state.onConfirm}
    />
  );

  return { confirm, ConfirmDialogElement };
}