import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVincularDispositivo, useVerificarDispositivo } from '@/hooks/useDispositivosMoveis';
import { getDeviceConfig, saveDeviceConfig, clearDeviceConfig } from '@/lib/offlineSync';
import { Loader2, QrCode, Keyboard, ShieldAlert, Wifi, WifiOff, Wrench, RefreshCw, Camera, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type BindingState = 'LOADING' | 'UNBOUND' | 'BOUND' | 'BLOCKED';

/**
 * Guard que exige vinculação do dispositivo via QR Code antes de usar o app.
 * Abre câmera real via html5-qrcode para escanear QR Code.
 * Fallback: input manual do token.
 */
export default function DeviceBindingGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BindingState>('LOADING');
  const [empresaNome, setEmpresaNome] = useState('');
  const [bloqueioMotivo, setBloqueioMotivo] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'qr-scanner-container';
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
      onSuccess: async (res) => {
        if (res.ok) {
          setEmpresaNome(res.empresa_nome || '');
          // Persist dispositivo_id + empresa_id on every verify (keeps config fresh)
          if (res.dispositivo_id) await saveDeviceConfig('dispositivo_id', res.dispositivo_id);
          if (res.empresa_id) await saveDeviceConfig('empresa_id', res.empresa_id);
          setState('BOUND');
        } else if (res.status === 'DESATIVADO' || res.status === 'EMPRESA_DESATIVOU') {
          setBloqueioMotivo(res.motivo || 'Dispositivo desativado pelo administrador.');
          setEmpresaNome(res.empresa_nome || '');
          setState('BLOCKED');
        } else {
          clearDeviceConfig();
          setState('UNBOUND');
        }
      },
      onError: () => {
        // Offline or transient error → assume still bound so user can work
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

  const handleVincular = useCallback(async (token: string) => {
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
            await saveDeviceConfig('dispositivo_id', res.dispositivo_id);
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
  }, [vincular, toast]);

  /* ── Extrair token de URL (deep link) ou texto cru ── */
  const extractToken = (text: string): string => {
    try {
      const url = new URL(text);
      return url.searchParams.get('token') || text;
    } catch {
      return text.trim();
    }
  };

  /* ── Scanner de câmera com html5-qrcode ── */
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const s = scannerRef.current;
        scannerRef.current = null;
        await s.stop().catch(() => {});
        s.clear();
      }
    } catch { /* scanner already stopped */ }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setCameraError('');
    setScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Wait for DOM to render the container
      await new Promise(r => setTimeout(r, 200));

      const container = document.getElementById(scannerContainerId);
      if (!container) {
        setScanning(false);
        setCameraError('Container do scanner não encontrado.');
        return;
      }

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          // QR lido com sucesso — stop scanner before processing
          await stopScanner();
          const token = extractToken(decodedText);
          if (token) {
            handleVincular(token);
          }
        },
        () => { /* ignora frames sem QR */ },
      );
    } catch (err: any) {
      setScanning(false);
      scannerRef.current = null;
      const msg = err?.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Permissão de câmera negada. Permita o acesso nas configurações do dispositivo.');
      } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
        setCameraError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setCameraError(`Erro ao abrir câmera: ${msg}`);
      }
      toast({ title: 'Câmera indisponível', description: 'Use o campo manual para digitar o token.', variant: 'destructive' });
      setShowManual(true);
    }
  }, [handleVincular, stopScanner, toast]);

  // Cleanup scanner ao desmontar
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  // Verifica URL de vinculação (deep link via QR)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token && state === 'UNBOUND') {
      handleVincular(token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [state, handleVincular]);

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
    /* ── Fullscreen scanner overlay ── */
    if (scanning) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80">
            <p className="text-white text-sm font-medium animate-pulse">
              Aponte a câmera para o QR Code...
            </p>
            <Button
              variant="destructive"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={stopScanner}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 relative">
            <div
              id={scannerContainerId}
              className="absolute inset-0"
              style={{ minHeight: '100%' }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="pt-8 pb-6 px-6 space-y-5">
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

            {cameraError && !scanning && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-3 text-center">
                {cameraError}
              </div>
            )}

            {!scanning && (
              <Button
                className="w-full h-16 text-lg font-bold gap-3 rounded-xl active:scale-95"
                onClick={startScanner}
                disabled={vincular.isPending}
              >
                {vincular.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
                ESCANEAR QR CODE
              </Button>
            )}

            {/* ── Fallback: input manual ── */}
            <div className="space-y-3 pt-1">
              {!showManual && !scanning && (
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2"
                  onClick={() => setShowManual(true)}
                >
                  <Keyboard className="h-4 w-4" />
                  Digitar código manualmente
                </Button>
              )}

              {showManual && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Keyboard className="h-3 w-3" /> Digite o token de vinculação:
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
            </div>

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
