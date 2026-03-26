import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVincularDispositivo, useVerificarDispositivo } from '@/hooks/useDispositivosMoveis';
import { getDeviceConfig, saveDeviceConfig, clearDeviceConfig } from '@/lib/offlineSync';
import { Loader2, QrCode, Keyboard, ShieldAlert, Wifi, WifiOff, Wrench, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type BindingState = 'LOADING' | 'UNBOUND' | 'BOUND' | 'BLOCKED';

/**
 * Guard que exige vinculação do dispositivo via QR Code antes de usar o app.
 * Se não vinculado → tela de escaneamento.
 * Se vinculado + ativo → renderiza children normalmente.
 * Se desativado → tela de bloqueio.
 */
export default function DeviceBindingGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BindingState>('LOADING');
  const [empresaNome, setEmpresaNome] = useState('');
  const [bloqueioMotivo, setBloqueioMotivo] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showManual, setShowManual] = useState(false);
  const verificar = useVerificarDispositivo();
  const vincular = useVincularDispositivo();
  const { toast } = useToast();

  useEffect(() => {
    checkDevice();
  }, []);

  const checkDevice = async () => {
    setState('LOADING');
    const deviceToken = await getDeviceConfig('device_token') as string | null;
    if (!deviceToken) {
      setState('UNBOUND');
      return;
    }

    verificar.mutate(deviceToken, {
      onSuccess: (res) => {
        if (res.ok) {
          setEmpresaNome(res.empresa_nome || '');
          setState('BOUND');
        } else if (res.status === 'DESATIVADO' || res.status === 'EMPRESA_DESATIVOU') {
          setBloqueioMotivo(res.motivo || 'Dispositivo desativado pelo administrador.');
          setEmpresaNome(res.empresa_nome || '');
          setState('BLOCKED');
        } else {
          // Token não encontrado, desvincular
          clearDeviceConfig();
          setState('UNBOUND');
        }
      },
      onError: () => {
        // Se offline, permite acesso com dados cacheados
        setState('BOUND');
      },
    });
  };

  const getDeviceId = () => {
    let id = localStorage.getItem('pcm_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('pcm_device_id', id);
    }
    return id;
  };

  const handleVincular = async (token: string) => {
    const deviceId = getDeviceId();
    vincular.mutate(
      {
        p_qr_token: token,
        p_device_id: deviceId,
        p_device_nome: navigator.userAgent.includes('Android') ? 'Android' : navigator.platform || 'Dispositivo',
        p_device_os: navigator.userAgent,
      },
      {
        onSuccess: async (res) => {
          if (res.ok) {
            await saveDeviceConfig('device_token', res.device_token);
            await saveDeviceConfig('empresa_id', res.empresa_id);
            await saveDeviceConfig('empresa_nome', res.empresa_nome);
            await saveDeviceConfig('tenant_slug', res.tenant_slug);
            setEmpresaNome(res.empresa_nome || '');
            setState('BOUND');
            toast({ title: 'Dispositivo vinculado!', description: `Conectado à ${res.empresa_nome}` });
          } else {
            toast({ title: 'Erro na vinculação', description: res.erro, variant: 'destructive' });
          }
        },
        onError: (e: Error) => {
          toast({ title: 'Erro', description: e.message, variant: 'destructive' });
        },
      },
    );
  };

  // Verifica URL de vinculação (deep link via QR)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token && state === 'UNBOUND') {
      handleVincular(token);
      // Limpa URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [state]);

  /* ─── LOADING ─── */
  if (state === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando dispositivo...</p>
        </div>
      </div>
    );
  }

  /* ─── UNBOUND (não vinculado) ─── */
  if (state === 'UNBOUND') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="pt-8 pb-6 px-6 space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Wrench className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">PCM Estratégico</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este dispositivo não está vinculado a nenhuma empresa.
                Peça ao administrador o <strong>QR Code de conexão</strong>.
              </p>
            </div>

            <Button
              className="w-full h-16 text-lg font-bold gap-3 rounded-xl active:scale-95"
              onClick={() => {
                // Em produção, aqui abriria o scanner de câmera nativo
                // Por enquanto, usa input manual como fallback
                setShowManual(true);
                toast({ title: 'Scanner QR', description: 'Use o campo abaixo para digitar o código, ou escaneie o QR Code.' });
              }}
              disabled={vincular.isPending}
            >
              {vincular.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <QrCode className="h-6 w-6" />}
              ESCANEAR QR CODE
            </Button>

            {showManual && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Keyboard className="h-3 w-3" /> Ou digite o código manualmente:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={manualToken}
                    onChange={e => setManualToken(e.target.value.trim())}
                    placeholder="Token de vinculação..."
                    className="h-12 text-base font-mono"
                  />
                  <Button
                    className="h-12 px-4"
                    onClick={() => { if (manualToken) handleVincular(manualToken); }}
                    disabled={!manualToken || vincular.isPending}
                  >
                    OK
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              {navigator.onLine ? (
                <><Wifi className="h-3 w-3 text-green-500" /> Online</>
              ) : (
                <><WifiOff className="h-3 w-3 text-red-500" /> Offline</>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── BLOCKED (desativado pelo admin) ─── */
  if (state === 'BLOCKED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm shadow-xl border-red-200">
          <CardContent className="pt-8 pb-6 px-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldAlert className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-red-800 dark:text-red-300">Acesso Bloqueado</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este dispositivo foi <strong>desativado</strong> pelo administrador.
              </p>
              {bloqueioMotivo && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                  {bloqueioMotivo}
                </p>
              )}
              {empresaNome && (
                <p className="text-xs text-muted-foreground">Empresa: {empresaNome}</p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full h-12 gap-2"
              onClick={checkDevice}
              disabled={verificar.isPending}
            >
              {verificar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── BOUND (vinculado e ativo) → renderiza app normal ─── */
  return <>{children}</>;
}
