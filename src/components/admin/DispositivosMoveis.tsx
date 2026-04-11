import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useDispositivosMoveis,
  useToggleDispositivo,
  useRemoveDispositivo,
  useDesativarTodosDispositivos,
  useQRCodesVinculacao,
  useCreateQRCode,
  useRevogarQRCode,
} from '@/hooks/useDispositivosMoveis';
import {
  Smartphone,
  QrCode,
  Shield,
  ShieldOff,
  Trash2,
  Plus,
  Copy,
  Printer,
  Ban,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import QRCodeDisplay from '@/components/mobile/QRCodeDisplay';

export default function DispositivosMoveis() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const { data: dispositivos, isLoading: loadingDevices } = useDispositivosMoveis();
  const { data: qrcodes, isLoading: loadingQR } = useQRCodesVinculacao();
  const toggleDevice = useToggleDispositivo();
  const removeDevice = useRemoveDispositivo();
  const desativarTodos = useDesativarTodosDispositivos();
  const createQR = useCreateQRCode();
  const revogarQR = useRevogarQRCode();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const [novoQRTipo, setNovoQRTipo] = useState<'UNICO' | 'MULTIPLO'>('MULTIPLO');
  const [novoQRExpiraDias, setNovoQRExpiraDias] = useState('30');
  const [showQR, setShowQR] = useState<string | null>(null);

  const ativos = (dispositivos || []).filter(d => d.ativo);
  const inativos = (dispositivos || []).filter(d => !d.ativo);
  const qrAtivos = (qrcodes || []).filter(q => q.ativo);

  const handleGerarQR = () => {
    if (!tenantId) return;
    const dias = parseInt(novoQRExpiraDias);
    const expira = dias > 0 ? new Date(Date.now() + dias * 86400000).toISOString() : undefined;
    createQR.mutate({
      empresa_id: tenantId,
      tipo: novoQRTipo,
      expira_em: expira,
      created_by: user?.id,
    });
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Código copiado!' });
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  const timeSince = (d: string | null) => {
    if (!d) return 'Nunca';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Dispositivos Móveis
          </h2>
          <p className="text-sm text-muted-foreground">
            {ativos.length} dispositivo{ativos.length !== 1 ? 's' : ''} ativo{ativos.length !== 1 ? 's' : ''}
            {inativos.length > 0 && ` · ${inativos.length} desativado${inativos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {ativos.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { if (tenantId) confirm({ title: 'Desativar todos', description: 'Desativar TODOS os dispositivos? Esta ação não pode ser desfeita.', confirmLabel: 'Desativar Todos', onConfirm: () => desativarTodos.mutateAsync(tenantId) }); }}
            disabled={desativarTodos.isPending}
          >
            <Ban className="h-4 w-4 mr-1" />
            Desativar Todos
          </Button>
        )}
      </div>

      {/* QR Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Codes de Vinculação
          </CardTitle>
          <CardDescription>
            Gere QR Codes para vincular dispositivos móveis à sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gerar novo QR */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={novoQRTipo} onValueChange={(v: 'UNICO' | 'MULTIPLO') => setNovoQRTipo(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLO">Múltiplos dispositivos</SelectItem>
                  <SelectItem value="UNICO">Uso único</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expira em (dias)</Label>
              <Input
                type="number"
                min={0}
                value={novoQRExpiraDias}
                onChange={e => setNovoQRExpiraDias(e.target.value)}
                className="h-9 w-24"
                placeholder="0 = nunca"
              />
            </div>
            <Button onClick={handleGerarQR} disabled={createQR.isPending} className="gap-1">
              <Plus className="h-4 w-4" />
              Gerar QR Code
            </Button>
          </div>

          <Separator />

          {/* Lista QR Codes */}
          {loadingQR ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : qrAtivos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum QR Code ativo. Gere um acima.
            </p>
          ) : (
            <div className="space-y-3">
              {qrAtivos.map(qr => (
                <div key={qr.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{qr.token.slice(0, 8)}...</Badge>
                        <Badge className={qr.tipo === 'UNICO' ? 'bg-secondary text-secondary-foreground' : 'bg-info/10 text-foreground'}>
                          {qr.tipo === 'UNICO' ? 'Uso Único' : 'Múltiplo'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Usos: {qr.usos}{qr.max_usos ? ` / ${qr.max_usos}` : ''} ·
                        Expira: {qr.expira_em ? formatDate(qr.expira_em) : 'Nunca'} ·
                        Criado: {formatDate(qr.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowQR(showQR === qr.id ? null : qr.id)}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(qr.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm({ title: 'Revogar QR Code', description: 'Revogar este QR Code? Dispositivos que ainda não usaram não poderão mais vincular.', confirmLabel: 'Revogar', onConfirm: () => revogarQR.mutateAsync(qr.id) })}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {showQR === qr.id && (
                    <div className="flex justify-center py-4 bg-white rounded-lg">
                      <QRCodeDisplay value={`${window.location.origin}/app/vincular?token=${qr.token}`} size={200} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispositivos Conectados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Dispositivos Conectados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDevices ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (dispositivos || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum dispositivo vinculado</p>
              <p className="text-sm">Gere um QR Code acima e escaneie com o app</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(dispositivos || []).map(d => (
                <div key={d.id} className={`border rounded-lg p-4 ${d.ativo ? '' : 'opacity-60 bg-muted/30'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{d.device_nome || 'Dispositivo desconhecido'}</span>
                        {d.ativo ? (
                          <Badge className="bg-success/10 text-success text-xs">
                            <Wifi className="h-3 w-3 mr-0.5" /> Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/10 text-destructive text-xs">
                            <WifiOff className="h-3 w-3 mr-0.5" /> Desativado
                          </Badge>
                        )}
                        {d.os_pendentes_offline > 0 && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
                            <Clock className="h-3 w-3 mr-0.5" /> {d.os_pendentes_offline} pendente{d.os_pendentes_offline > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.device_os || 'SO desconhecido'} ·
                        Último acesso: {timeSince(d.ultimo_acesso)} ·
                        ID: {d.device_id.slice(0, 12)}...
                      </p>
                      {!d.ativo && d.motivo_desativacao && (
                        <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          {d.motivo_desativacao}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {d.ativo ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          onClick={() => toggleDevice.mutate({ id: d.id, ativo: false })}
                          disabled={toggleDevice.isPending}
                        >
                          <ShieldOff className="h-3.5 w-3.5 mr-1" /> Desativar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-success border-success/20 hover:bg-success/10"
                          onClick={() => toggleDevice.mutate({ id: d.id, ativo: true })}
                          disabled={toggleDevice.isPending}
                        >
                          <Shield className="h-3.5 w-3.5 mr-1" /> Reativar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => confirm({ title: 'Remover dispositivo', description: 'Remover permanentemente este dispositivo? Esta ação não pode ser desfeita.', confirmLabel: 'Remover', onConfirm: () => removeDevice.mutateAsync(d.id) })}
                        disabled={removeDevice.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {ConfirmDialogElement}
    </div>
  );
}
