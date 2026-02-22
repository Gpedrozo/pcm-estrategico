import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import {
  useDadosEmpresa,
  useUpdateDadosEmpresa,
  uploadLogo,
} from "@/hooks/useDadosEmpresa";
import { useToast } from "@/hooks/use-toast";

const LOGO_SLOTS = [
  { key: "logo_principal_url", label: "Logo Principal (Header)", desc: "Exibida no cabeçalho do sistema" },
  { key: "logo_menu_url", label: "Logo Menu Lateral", desc: "Exibida no sidebar" },
  { key: "logo_login_url", label: "Logo Tela de Login", desc: "Exibida na página de login" },
  { key: "logo_pdf_url", label: "Logo para PDFs", desc: "Usada em documentos PDF gerados" },
  { key: "logo_os_url", label: "Logo Ordem de Serviço", desc: "Usada na O.S impressa" },
  { key: "logo_relatorio_url", label: "Logo Relatórios", desc: "Usada nos relatórios" },
] as const;

export function MasterLogoManager() {
  const { data: empresa, isLoading } = useDadosEmpresa();
  const updateMutation = useUpdateDadosEmpresa();
  const { toast } = useToast();

  const [uploading, setUploading] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = (slot: string) => {
    setActiveSlot(slot);
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlot || !empresa) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo de imagem.",
        variant: "destructive",
      });
      return;
    }

    setUploading(activeSlot);

    try {
      const path = `${activeSlot}/${Date.now()}-${file.name}`;
      const url = await uploadLogo(file, path);

      await updateMutation.mutateAsync({
        id: empresa.id,
        [activeSlot]: url,
      });

      toast({
        title: "Sucesso",
        description: "Logo atualizada com sucesso",
      });
    } catch (err: any) {
      toast({
        title: "Erro no upload",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
      setActiveSlot(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ImageIcon className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">Gerenciamento de Identidade Visual</h2>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOGO_SLOTS.map((slot) => {
          const url = empresa?.[slot.key as keyof typeof empresa] as string;

          return (
            <Card key={slot.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{slot.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{slot.desc}</p>
              </CardHeader>

              <CardContent>
                <div className="h-24 bg-muted rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                  {url ? (
                    <img
                      src={url}
                      alt={slot.label}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => triggerUpload(slot.key)}
                  disabled={uploading === slot.key}
                >
                  {uploading === slot.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}

                  {url ? "Alterar" : "Enviar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
