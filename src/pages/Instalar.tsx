import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Monitor, Smartphone, CheckCircle, Loader2, Settings } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<"windows" | "mac" | "android" | "ios" | "unknown">("unknown");

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("android")) {
      setPlatform("android");
    } else if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      setPlatform("ios");
    } else if (userAgent.includes("mac")) {
      setPlatform("mac");
    } else if (userAgent.includes("win")) {
      setPlatform("windows");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error("Install error:", error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const getInstructions = () => {
    switch (platform) {
      case "windows":
        return {
          title: "Instalar no Windows",
          icon: Monitor,
          steps: [
            "Clique no botão 'Instalar Aplicativo' abaixo",
            "Confirme a instalação na janela que aparecer",
            "O app será adicionado ao Menu Iniciar e Área de Trabalho",
            "Clique duas vezes no ícone para abrir o sistema"
          ]
        };
      case "mac":
        return {
          title: "Instalar no Mac",
          icon: Monitor,
          steps: [
            "Clique no botão 'Instalar Aplicativo' abaixo",
            "Ou clique no ícone de instalação na barra de endereço",
            "O app aparecerá no Launchpad",
            "Clique no ícone para abrir o sistema"
          ]
        };
      case "android":
        return {
          title: "Instalar no Android",
          icon: Smartphone,
          steps: [
            "Toque no botão 'Instalar Aplicativo' abaixo",
            "Ou toque nos 3 pontos do navegador → 'Adicionar à tela inicial'",
            "Confirme a instalação",
            "O app aparecerá na sua tela inicial"
          ]
        };
      case "ios":
        return {
          title: "Instalar no iPhone/iPad",
          icon: Smartphone,
          steps: [
            "Toque no ícone de compartilhamento (quadrado com seta para cima)",
            "Role e toque em 'Adicionar à Tela de Início'",
            "Confirme tocando em 'Adicionar'",
            "O app aparecerá na sua tela inicial"
          ]
        };
      default:
        return {
          title: "Instalar Aplicativo",
          icon: Download,
          steps: [
            "Clique no botão de instalação na barra de endereço do navegador",
            "Ou acesse o menu do navegador",
            "Selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'",
            "Confirme a instalação"
          ]
        };
    }
  };

  const instructions = getInstructions();
  const IconComponent = instructions.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <img 
              src="/icons/icon-192x192.png" 
              alt="PCM Estratégico" 
              className="h-16 w-16 rounded-xl"
            />
          </div>
          <CardTitle className="text-2xl">PCM Estratégico</CardTitle>
          <CardDescription className="text-lg">
            Sistema de Planejamento e Controle de Manutenção Industrial
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="h-8 w-8" />
                <span className="text-xl font-semibold">Aplicativo Instalado!</span>
              </div>
              <p className="text-muted-foreground">
                O PCM Estratégico foi instalado com sucesso no seu dispositivo.
                Você pode acessá-lo pela área de trabalho ou menu de aplicativos.
              </p>
              <Button onClick={() => window.location.href = "/dashboard"} size="lg">
                Abrir Sistema
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <IconComponent className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg">{instructions.title}</h3>
                </div>
                
                <ol className="space-y-3">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {deferredPrompt && (
                <Button 
                  onClick={handleInstall} 
                  size="lg" 
                  className="w-full"
                  disabled={isInstalling}
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Instalando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Instalar Aplicativo
                    </>
                  )}
                </Button>
              )}

              {!deferredPrompt && platform !== "ios" && (
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {platform === "unknown" 
                      ? "Use um navegador moderno (Chrome, Edge, Safari) para instalar o aplicativo."
                      : "Procure pelo ícone de instalação na barra de endereço do navegador ou no menu."}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <Monitor className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Desktop</p>
                  <p className="text-xs text-muted-foreground">Windows, Mac, Linux</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <Smartphone className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Mobile</p>
                  <p className="text-xs text-muted-foreground">Android, iOS</p>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>✓ Funciona offline</p>
                <p>✓ Atualizações automáticas</p>
                <p>✓ Sem necessidade de app store</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
