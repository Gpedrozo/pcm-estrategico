import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, QrCode, Shield, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';

interface InstaladorAPKDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// URL do APK — arquivo estático em public/download/app/index.html redireciona ao GitHub Releases
const APK_DOWNLOAD_URL = '/download/app/';

export function InstaladorAPKDialog({ open, onOpenChange }: InstaladorAPKDialogProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    // Abre em nova aba — o index.html estático faz redirect imediato para o APK
    const link = document.createElement('a');
    link.href = APK_DOWNLOAD_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDownloaded(false); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Smartphone className="h-6 w-6 text-blue-600" />
            Instalador — App Mecânico
          </DialogTitle>
          <DialogDescription>
            Baixe e instale o aplicativo para acessar as ordens de serviço diretamente no celular.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Download Section */}
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">PCM Mecânico (App Nativo)</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">React Native — Android 6.0+</p>
              </div>
              <Button onClick={handleDownload} className="gap-2" variant={downloaded ? "outline" : "default"}>
                {downloaded ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Download className="h-4 w-4" />}
                {downloaded ? 'Baixando...' : 'Baixar APK'}
              </Button>
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Como instalar
            </h3>

            <div className="space-y-2">
              <Step number={1} title="Baixe o APK no celular">
                Abra o link de download diretamente no navegador do celular, ou envie 
                o arquivo via WhatsApp, Google Drive ou e-mail.
              </Step>

              <Step number={2} title="Permita fontes desconhecidas">
                No celular, ao abrir o arquivo, o Android pedirá permissão para instalar apps 
                de fontes desconhecidas. Toque em <strong>"Configurações"</strong> e ative a opção.
              </Step>

              <Step number={3} title="Instale o aplicativo">
                Toque em <strong>"Instalar"</strong> e aguarde. Após a instalação, 
                toque em <strong>"Abrir"</strong>.
              </Step>
            </div>
          </div>

          {/* QR Code connection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Como conectar à empresa
            </h3>

            <div className="space-y-2">
              <Step number={4} title="Gere o QR Code no sistema">
                No painel web, acesse <strong>Administração → Dispositivos Móveis</strong> e 
                gere um QR Code de vinculação para o mecânico.
              </Step>

              <Step number={5} title="Escaneie com o app">
                Abra o app no celular e escaneie o QR Code exibido na tela do computador. 
                O dispositivo será vinculado automaticamente à empresa e ao mecânico.
              </Step>

              <Step number={6} title="Pronto!">
                O mecânico já pode receber e executar ordens de serviço diretamente pelo celular.
              </Step>
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 flex gap-3 items-start">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Segurança:</strong> O APK é assinado exclusivamente para este sistema. 
              Cada dispositivo precisa ser autorizado via QR Code pelo administrador — 
              não é possível acessar dados sem vinculação prévia.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
