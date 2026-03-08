import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Lock, Save } from 'lucide-react';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import {
  useConfiguracoesOperacionaisEmpresa,
  useSalvarConfiguracoesOperacionaisEmpresa,
  type ConfiguracoesOperacionaisEmpresa,
} from '@/hooks/useConfiguracoesOperacionaisEmpresa';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const initialForm: ConfiguracoesOperacionaisEmpresa = {
  endereco: '',
  telefone: '',
  email: '',
  site: '',
  responsavel_nome: '',
  responsavel_cargo: '',
  observacoes: '',
};

export default function ConfiguracoesEmpresa() {
  const { isAdmin } = useAuth();
  const { data: empresa, isLoading: loadingEmpresa } = useDadosEmpresa();
  const { data: operacionais, isLoading: loadingOperacionais } = useConfiguracoesOperacionaisEmpresa();
  const salvar = useSalvarConfiguracoesOperacionaisEmpresa();

  const [form, setForm] = useState<ConfiguracoesOperacionaisEmpresa>(initialForm);

  useEffect(() => {
    if (!operacionais?.valor) {
      setForm(initialForm);
      return;
    }

    setForm({
      endereco: operacionais.valor.endereco ?? '',
      telefone: operacionais.valor.telefone ?? '',
      email: operacionais.valor.email ?? '',
      site: operacionais.valor.site ?? '',
      responsavel_nome: operacionais.valor.responsavel_nome ?? '',
      responsavel_cargo: operacionais.valor.responsavel_cargo ?? '',
      observacoes: operacionais.valor.observacoes ?? '',
    });
  }, [operacionais]);

  const legalData = useMemo(
    () => ({
      razao_social: empresa?.razao_social ?? '-',
      nome_fantasia: empresa?.nome_fantasia ?? '-',
      cnpj: empresa?.cnpj ?? '-',
    }),
    [empresa],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    await salvar.mutateAsync(form, {
      onSuccess: () => {
        toast({ title: 'Configurações salvas', description: 'Dados operacionais atualizados com sucesso.' });
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Falha ao salvar configurações operacionais.';
        toast({
          title: 'Erro ao salvar',
          description: message,
          variant: 'destructive',
        });
      },
    });
  };

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Configurações da Empresa</h1>
        <p className="text-muted-foreground">Somente administradores podem editar configurações operacionais.</p>
      </div>
    );
  }

  if (loadingEmpresa || loadingOperacionais) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações da Empresa</h1>
        <p className="text-muted-foreground">Dados legais ficam somente leitura no tenant. Edite apenas dados operacionais.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Dados Legais (somente leitura)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label>Razão Social</Label>
            <Input value={legalData.razao_social} readOnly disabled />
          </div>
          <div>
            <Label>Nome Fantasia</Label>
            <Input value={legalData.nome_fantasia} readOnly disabled />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={legalData.cnpj} readOnly disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Configurações Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Endereço Operacional</Label>
                <Input value={form.endereco ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, endereco: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone Operacional</Label>
                <Input value={form.telefone ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email Operacional</Label>
                <Input type="email" value={form.email ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input value={form.site ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, site: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Responsável Operacional</Label>
                <Input value={form.responsavel_nome ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, responsavel_nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cargo do Responsável</Label>
                <Input value={form.responsavel_cargo ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, responsavel_cargo: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações Operacionais</Label>
              <Textarea rows={4} value={form.observacoes ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={salvar.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Salvar Configurações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
