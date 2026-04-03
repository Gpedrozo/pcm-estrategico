import { writeFileSync } from 'fs';

const content = `import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, QrCode, Shield, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

interface InstaladorAPKDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Build URL do EAS \u2014 atualizar ap\u00f3s primeiro build com eas build
const EAS_APK_URL = 'https://expo.dev/accounts/gpedrozo/projects/mecanico-app/builds';

export function InstaladorAPKDialog({ open, onOpenChange }: InstaladorAPKDialogProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    window.open(EAS_APK_URL, '_blank');
    setDownloaded(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDownloaded(false); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Smartphone className="h-6 w-6 text-blue-600" />
            Instalador \u2014 App Mec\u00e2nico
          </DialogTitle>
          <DialogDescription>
            Baixe e instale o aplicativo para acessar as ordens de servi\u00e7o diretamente no celular.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Download Section */}
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">PCM Mec\u00e2nico (App Nativo)</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">React Native \u2014 Android 6.0+</p>
              </div>
              <Button onClick={handleDownload} className="gap-2" variant={downloaded ? "outline" : "default"}>
                {downloaded ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <ExternalLink className="h-4 w-4" />}
                {downloaded ? 'Aberto' : 'Baixar APK'}
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
                No celular, ao abrir o arquivo, o Android pedir\u00e1 permiss\u00e3o para instalar apps
                de fontes desconhecidas. Toque em <strong>\u201cConfigura\u00e7\u00f5es\u201d</strong> e ative a op\u00e7\u00e3o.
              </Step>

              <Step number={3} title="Instale o aplicativo">
                Toque em <strong>\u201cInstalar\u201d</strong> e aguarde. Ap\u00f3s a instala\u00e7\u00e3o,
                toque em <strong>\u201cAbrir\u201d</strong>.
              </Step>
            </div>
          </div>

          {/* QR Code connection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Como conectar \u00e0 empresa
            </h3>

            <div className="space-y-2">
              <Step number={4} title="Gere o QR Code no sistema">
                No painel web, acesse <strong>Administra\u00e7\u00e3o \u2192 Dispositivos M\u00f3veis</strong> e
                gere um QR Code de vincula\u00e7\u00e3o para o mec\u00e2nico.
              </Step>

              <Step number={5} title="Escaneie com o app">
                Abra o app no celular e escaneie o QR Code exibido na tela do computador.
                O dispositivo ser\u00e1 vinculado automaticamente \u00e0 empresa e ao mec\u00e2nico.
              </Step>

              <Step number={6} title="Pronto!">
                O mec\u00e2nico j\u00e1 pode receber e executar ordens de servi\u00e7o diretamente pelo celular.
              </Step>
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 flex gap-3 items-start">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Seguran\u00e7a:</strong> O APK \u00e9 assinado exclusivamente para este sistema.
              Cada dispositivo precisa ser autorizado via QR Code pelo administrador \u2014
              n\u00e3o \u00e9 poss\u00edvel acessar dados sem vincula\u00e7\u00e3o pr\u00e9via.
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
`;

writeFileSync('src/components/ajuda/InstaladorAPKDialog.tsx', content, 'utf8');
console.log('DONE');
