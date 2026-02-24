import { useState } from 'react';
import { useDadosEmpresa, uploadLogo, type DadosEmpresa } from '@/hooks/useDadosEmpresa';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Image as ImageIcon, Trash2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLogAuditoria } from '@/hooks/useAuditoria';

interface LogoSlot {
  key: keyof Pick<DadosEmpresa, 'logo_principal_url' | 'logo_menu_url' | 'logo_login_url' | 'logo_os_url' | 'logo_pdf_url' | 'logo_relatorio_url'>;
  label: string;
  description: string;
  dimensions: string;
}

const LOGO_SLOTS: LogoSlot[] = [
  { key: 'logo_principal_url', label: 'Logo Principal', description: 'Logo padrão usado em todo o sistema', dimensions: '200×60px' },
  { key: 'logo_menu_url', label: 'Logo Menu Lateral', description: 'Exibida no menu de navegação lateral', dimensions: '160×40px' },
  { key: 'logo_login_url', label: 'Logo Tela de Login', description: 'Exibida na tela de autenticação', dimensions: '300×100px' },
  { key: 'logo_os_url', label: 'Logo Ordens de Serviço', description: 'Cabeçalho na impressão de OS', dimensions: '200×60px' },
  { key: 'logo_pdf_url', label: 'Logo Documentos PDF', description: 'Cabeçalho de documentos PDF', dimensions: '200×60px' },
  { key: 'logo_relatorio_url', label: 'Logo Relatórios', description: 'Cabeçalho de relatórios gerenciais', dimensions: '200×60px' },
];

export function MasterLogoManager() {
  const { data: empresa, isLoading } = useDadosEmpresa();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { log } = useLogAuditoria();
  const [uploading, setUploading] = useState<string | null>(null);

  const updateLogoMutation = useMutation({
    mutationFn: async ({ logoKey, url }: { logoKey: string; url: string | null }) => {
      if (!empresa?.id) throw new Error('Cadastre os dados da empresa primeiro.');
      const { error } = await supabase.from('dados_empresa').update({ [logoKey]: url }).eq('id', empresa.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
      const slotLabel = LOGO_SLOTS.find(s => s.key === vars.logoKey)?.label || vars.logoKey;
      toast({ title: 'Logo atualizada', description: `${slotLabel} salva com sucesso.` });
      log('ATUALIZAR_LOGO', `Logo "${slotLabel}" ${vars.url ? 'atualizada' : 'removida'}`, 'MASTER_TI');
    },
    onError: (error: Error) => toast({ title: 'Erro', description: error.message, variant: 'destructive' }),
  });

  async function handleUpload(slot: LogoSlot, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(slot.key);
      const url = await uploadLogo(file, `${slot.key.replace('_url', '')}-${Date.now()}.${file.name.split('.').pop()}`);
      await updateLogoMutation.mutateAsync({ logoKey: slot.key, url });
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  }

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!empresa) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa cadastrada</h3>
          <p className="text-muted-foreground text-sm mt-2">Cadastre os dados da empresa na aba <strong>Empresa</strong> antes de gerenciar logos.</p>
        </CardContent>
      </Card>
    );
  }

  const configuredCount = LOGO_SLOTS.filter(s => !!(empresa[s.key] as string | null)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Gerenciamento de Logos</h2>
            <p className="text-sm text-muted-foreground">Logos auto-redimensionáveis em cada contexto</p>
          </div>
        </div>
        <Badge variant="secondary">{configuredCount}/{LOGO_SLOTS.length} configuradas</Badge>
      </div>

      <Card className="bg-info/5 border-info/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-info mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-info">Logos Auto-Redimensionáveis</p>
            <p className="text-muted-foreground mt-1">Use imagens PNG/SVG com fundo transparente para melhor resultado. As logos se adaptam automaticamente ao espaço disponível.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOGO_SLOTS.map(slot => {
          const currentUrl = empresa[slot.key] as string | null;
          const isUploading = uploading === slot.key;
          return (
            <Card key={slot.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  {slot.label}
                  {currentUrl ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">Configurada</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Sem logo</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{slot.description}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{slot.dimensions}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-28 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                  {currentUrl ? (
                    <img src={currentUrl} alt={slot.label} className="max-h-full max-w-full object-contain p-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-[10px] text-muted-foreground mt-1">Nenhuma logo</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" asChild disabled={isUploading}>
                    <label className="cursor-pointer">
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {isUploading ? 'Enviando...' : 'Upload'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(slot, e)} disabled={isUploading} />
                    </label>
                  </Button>
                  {currentUrl && (
                    <Button variant="ghost" size="sm" onClick={() => updateLogoMutation.mutate({ logoKey: slot.key, url: null })} disabled={updateLogoMutation.isPending}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
