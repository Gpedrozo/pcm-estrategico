import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Building2 } from 'lucide-react';
import { useDadosEmpresa, useUpdateDadosEmpresa } from '@/hooks/useDadosEmpresa';

export function MasterEmpresaData() {
  const { data: empresa, isLoading } = useDadosEmpresa();
  const updateMutation = useUpdateDadosEmpresa();
  const [form, setForm] = useState({
    razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '',
    endereco: '', cidade: '', estado: '', cep: '',
    telefone: '', whatsapp: '', email: '', site: '',
    responsavel_nome: '', responsavel_cargo: '',
  });

  useEffect(() => {
    if (empresa) {
      setForm({
        razao_social: empresa.razao_social || '',
        nome_fantasia: empresa.nome_fantasia || '',
        cnpj: empresa.cnpj || '',
        inscricao_estadual: empresa.inscricao_estadual || '',
        endereco: empresa.endereco || '',
        cidade: empresa.cidade || '',
        estado: empresa.estado || '',
        cep: empresa.cep || '',
        telefone: empresa.telefone || '',
        whatsapp: empresa.whatsapp || '',
        email: empresa.email || '',
        site: empresa.site || '',
        responsavel_nome: empresa.responsavel_nome || '',
        responsavel_cargo: empresa.responsavel_cargo || '',
      });
    }
  }, [empresa]);

  const handleSave = () => {
    if (!empresa) return;
    updateMutation.mutate({ id: empresa.id, ...form });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Dados da Empresa</h2>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Cadastrais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Razão Social', 'razao_social'],
              ['Nome Fantasia', 'nome_fantasia'],
              ['CNPJ', 'cnpj'],
              ['Inscrição Estadual', 'inscricao_estadual'],
            ].map(([label, key]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <Input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Telefone', 'telefone'],
              ['WhatsApp', 'whatsapp'],
              ['E-mail', 'email'],
              ['Site', 'site'],
            ].map(([label, key]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Responsável Técnico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do Responsável</Label>
              <Input value={form.responsavel_nome} onChange={e => setForm(f => ({ ...f, responsavel_nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Input value={form.responsavel_cargo} onChange={e => setForm(f => ({ ...f, responsavel_cargo: e.target.value }))} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
