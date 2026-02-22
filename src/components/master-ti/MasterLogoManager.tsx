import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import {
  useDadosEmpresa,
  useUpdateDadosEmpresa,
  uploadLogo,
} from "@/hooks/useDadosEmpresa";
import { useToast } from "@/hooks/use-toast";

type LogoType =
  | "logo_principal_url"
  | "logo_menu_url"
  | "logo_login_url"
  | "logo_pdf_url"
  | "logo_os_url"
  | "logo_relatorio_url";

const LOGOS: { key: LogoType; label: string }[] = [
  { key: "logo_principal_url", label: "Logo do Sistema" },
  { key: "logo_menu_url", label: "Logo Menu" },
  { key: "logo_login_url", label: "Logo Login" },
  { key: "logo_pdf_url", label: "Logo PDF" },
  { key: "logo_os_url", label: "Logo Ordem de Serviço" },
  { key: "logo_relatorio_url", label: "Logo Relatórios" },
];

export function MasterLogoManager() {
  const { data: empresa, isLoading, refetch } = useDadosEmpresa();
  const updateEmpresa = useUpdateDadosEmpresa();
  const { toast } = useToast();

  const fileInput = useRef<HTMLInputElement>(null);

  const [logoSelecionada, setLogoSelecionada] = useState<LogoType | null>(null);
  const [uploading, setUploading] = useState(false);

  function escolherLogo(tipo: LogoType) {
    setLogoSelecionada(tipo);
    fileInput.current?.click();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file || !logoSelecionada || !empresa) return;

    try {
      setUploading(true);

      const path = `${logoSelecionada}/${Date.now()}-${file.name}`;

      const url = await uploadLogo(file, path);

      await updateEmpresa.mutateAsync({
        id: empresa.id,
        [logoSelecionada]: url,
      });

      await refetch();

      toast({
        title: "Logo atualizada",
        description: "Nova imagem aplicada ao sistema.",
      });
    } catch (error: any) {
      console.error(error);

      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setLogoSelecionada(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!empresa) {
    return <div>Nenhuma empresa cadastrada.</div>;
  }

  return (
    <div className="space-y-6">

      <input
        type="file"
        ref={fileInput}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />

      {LOGOS.map((logo) => {
        const url = empresa?.[logo.key];

        return (
          <Card key={logo.key}>
            <CardHeader>
              <CardTitle>{logo.label}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              {/* LOGO ATUAL */}
              <div className="w-full h-32 bg-muted rounded flex items-center justify-center overflow-hidden">

                {url ? (
                  <img
                    src={url}
                    alt="logo"
                    className="max-h-full object-contain"
                  />
                ) : (
                  <span className="text-muted-foreground">
                    Nenhuma logo cadastrada
                  </span>
                )}

              </div>

              {/* BOTÃO */}
              <Button
                className="w-full"
                onClick={() => escolherLogo(logo.key)}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Alterar Logo
                  </>
                )}
              </Button>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
