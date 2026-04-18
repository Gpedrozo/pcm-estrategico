import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  useDispositivosMoveis,
  useToggleDispositivo,
  useRemoveDispositivo,
  useDesativarTodosDispositivos,
} from '@/hooks/useDispositivosMoveis';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Smartphone,
  Ban,
  Wifi,
  WifiOff,
  Settings,
  Building2,
} from 'lucide-react';

import type { OwnerAction } from '@/services/ownerPortal.service';

interface Props {
  selectedEmpresaId: string | null;
  empresas: Record<string, unknown>[];
  runAction: (action: OwnerAction, payload: Record<string, unknown>, successMsg: string) => void;
  busy: boolean;
}

export default function OwnerDispositivosTab({ selectedEmpresaId, empresas: _empresas, runAction, busy: _busy }: Props) {
  const { toast } = useToast();
  const { data: dispositivos, isLoading } = useDispositivosMoveis(selectedEmpresaId || undefined);
  const toggleDevice = useToggleDispositivo();
  const removeDevice = useRemoveDispositivo();
  const desativarTodos = useDesativarTodosDispositivos();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const [maxDispositivos, setMaxDispositivos] = useState('10');

  const ativos = (dispositivos || []).filter(d => d.ativo);
  const _inativos = (dispositivos || []).filter(d => !d.ativo);

  const timeSince = (d: string | null) => {
    if (!d) return 'Nunca';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const handleToggleEmpresaDispositivos = async (ativo: boolean) => {
    if (!selectedEmpresaId) return;
    runAction('update_company' as OwnerAction, { empresa_id: selectedEmpresaId, company: { dispositivos_moveis_ativos: ativo } }, ativo ? 'Dispositivos móveis ativados' : 'Dispositivos móveis desativados para esta empresa');
  };

  const handleUpdateMaxDispositivos = async () => {
    if (!selectedEmpresaId) return;
    const val = parseInt(maxDispositivos);
    if (isNaN(val) || val < 1) return;
    runAction('update_company' as OwnerAction, { empresa_id: selectedEmpresaId, company: { max_dispositivos_moveis: val } }, `Limite atualizado para ${val} dispositivos`);
  };


  if (!selectedEmpresaId) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Selecione uma empresa no topo para gerenciar dispositivos.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Configurações da Empresa */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
          <Settings className="h-4 w-4" /> Configurações de Dispositivos Móveis
        </h3>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Dispositivos Móveis Ativos</p>
            <p className="text-xs text-muted-foreground">Desativar bloqueia TODOS os dispositivos desta empresa</p>
          </div>
          <Switch
            defaultChecked={true}
            onCheckedChange={handleToggleEmpresaDispositivos}
          />
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs">Limite máximo de dispositivos</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                min={1}
                max={100}
                value={maxDispositivos}
                onChange={e => setMaxDispositivos(e.target.value)}
                className="w-24 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={handleUpdateMaxDispositivos}>
                Salvar
              </Button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-card-foreground">{ativos.length}</p>
            <p className="text-xs text-muted-foreground">ativos agora</p>
          </div>
        </div>

        {ativos.length > 0 && (
          <>
            <Separator />
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                confirm({
                  title: 'Desativar todos dispositivos',
                  description: 'ATENÇÃO: Isso vai desativar TODOS os dispositivos desta empresa. Continuar?',
                  confirmLabel: 'Desativar Todos',
                  onConfirm: () => desativarTodos.mutateAsync(selectedEmpresaId!),
                });
              }}
              disabled={desativarTodos.isPending}
            >
              <Ban className="h-4 w-4 mr-1" />
              Desativar Todos os Dispositivos ({ativos.length})
            </Button>
          </>
        )}
      </div>

      {/* Lista de Dispositivos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2 mb-4">
          <Smartphone className="h-4 w-4" /> Dispositivos ({(dispositivos || []).length})
        </h3>

        {isLoading ? (
          <p className="text-sm text-muted-foreground/60 text-center py-4">Carregando...</p>
        ) : (dispositivos || []).length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-8">
            Nenhum dispositivo vinculado a esta empresa.
          </p>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left">Dispositivo</th>
                  <th className="px-2 py-2 text-left">SO</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Último Acesso</th>
                  <th className="px-2 py-2 text-left">Pendentes</th>
                  <th className="px-2 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(dispositivos || []).map(d => (
                  <tr key={d.id} className={`border-t border-border/50 ${!d.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-2 py-2 font-medium">{d.device_nome || 'Desconhecido'}</td>
                    <td className="px-2 py-2 max-w-[120px] truncate">{(d.device_os || '').slice(0, 30)}</td>
                    <td className="px-2 py-2">
                      {d.ativo ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                          <Wifi className="h-3 w-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <WifiOff className="h-3 w-3" /> Desativado
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">{timeSince(d.ultimo_acesso)}</td>
                    <td className="px-2 py-2">
                      {d.os_pendentes_offline > 0 ? (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">{d.os_pendentes_offline}</Badge>
                      ) : '0'}
                    </td>
                    <td className="px-2 py-2 text-right space-x-1">
                      {d.ativo ? (
                        <button
                          className="rounded px-2 py-1 text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => toggleDevice.mutate({ id: d.id, ativo: false })}
                          disabled={toggleDevice.isPending}
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          className="rounded px-2 py-1 text-xs border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                          onClick={() => toggleDevice.mutate({ id: d.id, ativo: true })}
                          disabled={toggleDevice.isPending}
                        >
                          Reativar
                        </button>
                      )}
                      <button
                        className="rounded px-2 py-1 text-xs border border-border text-muted-foreground hover:bg-muted/50"
                        onClick={() => {
                          confirm({
                            title: 'Remover dispositivo',
                            description: 'Remover permanentemente este dispositivo? Esta ação não pode ser desfeita.',
                            confirmLabel: 'Remover',
                            onConfirm: () => removeDevice.mutateAsync(d.id),
                          });
                        }}
                        disabled={removeDevice.isPending}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {ConfirmDialogElement}
    </div>
  );
}
