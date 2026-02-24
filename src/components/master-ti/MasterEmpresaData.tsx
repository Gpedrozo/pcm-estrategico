import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Building2, Plus } from 'lucide-react';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLogAuditoria } from '@/hooks/useAuditoria';

const FIELDS_CADASTRAIS = [
  { label: 'Razão Social *', key: 'razao_social' },
  { label: 'Nome Fantasia', key: 'nome_fantasia' },
  { label: 'CNPJ', key: 'cnpj' },
  { label: 'Inscrição Estadual', key: 'inscricao_estadual' },
];

const FIELDS_CONTATO = [
  { label: 'Telefone', key: 'telefone' },
  { label: 'WhatsApp', key: 'whatsapp' },
  { label: 'E-mail', key: 'email' },
  { label: 'Site', key: 'site' },
];

export function MasterEmpresaData() {
  const { data: empresa, isLoading } = useDadosEmpresa();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { log } = useLogAuditoria();

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

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      if (empresa?.id) {
        const { error } = await supabase.from('dados_empresa').update(formData).eq('id', empresa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dados_empresa').insert([formData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
      toast({ title: 'Sucesso!', description: empresa?.id ? 'Dados atualizados.' : 'Empresa cadastrada.' });
      log(empresa?.id ? 'EDITAR_EMPRESA' : 'CRIAR_EMPRESA', `Dados da empresa ${empresa?.id ? 'atualizados' : 'cadastrados'}`, 'MASTER_TI');
    },
    onError: (error: Error) => toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }),
  });

  const handleSave = () => {
    if (!form.razao_social.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Razão Social é obrigatória.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(form);
  };

  const updateField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Dados da Empresa</h2>
            {!empresa && <p className="text-sm text-muted-foreground">Preencha os dados para cadastrar a empresa.</p>}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : empresa ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {empresa ? 'Salvar Alterações' : 'Cadastrar Empresa'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Cadastrais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {FIELDS_CADASTRAIS.map(f => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                <Input value={(form as any)[f.key]} onChange={e => updateField(f.key, e.target.value)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1"><Label>Endereço</Label><Input value={form.endereco} onChange={e => updateField('endereco', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Cidade</Label><Input value={form.cidade} onChange={e => updateField('cidade', e.target.value)} /></div>
              <div className="space-y-1"><Label>Estado</Label><Input value={form.estado} onChange={e => updateField('estado', e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>CEP</Label><Input value={form.cep} onChange={e => updateField('cep', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {FIELDS_CONTATO.map(f => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                <Input value={(form as any)[f.key]} onChange={e => updateField(f.key, e.target.value)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Responsável Técnico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1"><Label>Nome</Label><Input value={form.responsavel_nome} onChange={e => updateField('responsavel_nome', e.target.value)} /></div>
            <div className="space-y-1"><Label>Cargo</Label><Input value={form.responsavel_cargo} onChange={e => updateField('responsavel_cargo', e.target.value)} /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
