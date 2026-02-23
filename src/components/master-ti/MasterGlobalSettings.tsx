import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, Loader2, Edit2, X, Check, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLogAuditoria } from '@/hooks/useAuditoria';

interface ConfigItem {
  id: string;
  chave: string;
  valor: string | null;
  descricao: string | null;
  categoria: string | null;
  tipo: string | null;
  editavel: boolean | null;
}

export function MasterGlobalSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { log } = useLogAuditoria();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newConfig, setNewConfig] = useState({ chave: '', valor: '', descricao: '', categoria: 'GERAL', tipo: 'STRING' });

  const { data: configs, isLoading } = useQuery({
    queryKey: ['master-configs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracoes_sistema').select('*').order('categoria').order('chave');
      if (error) throw error;
      return data as ConfigItem[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: string }) => {
      const { error } = await supabase.from('configuracoes_sistema').update({ valor }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['master-configs'] });
      toast({ title: 'Configuração salva' });
      log('EDITAR_CONFIGURACAO', `Configuração atualizada`, 'MASTER_TI');
      setEditingId(null);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const addMutation = useMutation({
    mutationFn: async (config: typeof newConfig) => {
      const { error } = await supabase.from('configuracoes_sistema').insert([config]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-configs'] });
      toast({ title: 'Configuração criada' });
      log('CRIAR_CONFIGURACAO', `Nova configuração "${newConfig.chave}" criada`, 'MASTER_TI');
      setShowAdd(false);
      setNewConfig({ chave: '', valor: '', descricao: '', categoria: 'GERAL', tipo: 'STRING' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const grouped = configs?.reduce((acc, c) => {
    const cat = c.categoria || 'GERAL';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {} as Record<string, ConfigItem[]>) || {};

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Configurações do Sistema</h2>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Configuração</Button>
      </div>

      {!configs?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma configuração cadastrada</h3>
            <p className="text-muted-foreground text-sm">Clique em "Nova Configuração" para criar.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                {category}
                <Badge variant="secondary" className="ml-2">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map(config => (
                <div key={config.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono">{config.chave}</p>
                      {config.tipo && <Badge variant="outline" className="text-[10px]">{config.tipo}</Badge>}
                    </div>
                    {config.descricao && <p className="text-xs text-muted-foreground mt-0.5">{config.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {editingId === config.id ? (
                      <>
                        <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-48 h-8 text-sm" />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateMutation.mutate({ id: config.id, valor: editValue })} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-mono text-muted-foreground">{config.valor || '—'}</span>
                        {config.editavel !== false && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(config.id); setEditValue(config.valor || ''); }}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Config Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Configuração</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addMutation.mutate(newConfig); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Chave *</Label>
              <Input value={newConfig.chave} onChange={e => setNewConfig(c => ({ ...c, chave: e.target.value }))} placeholder="NOME_DA_CONFIGURACAO" required />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={newConfig.valor} onChange={e => setNewConfig(c => ({ ...c, valor: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={newConfig.descricao} onChange={e => setNewConfig(c => ({ ...c, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={newConfig.categoria} onValueChange={v => setNewConfig(c => ({ ...c, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GERAL">Geral</SelectItem>
                    <SelectItem value="SISTEMA">Sistema</SelectItem>
                    <SelectItem value="NOTIFICACOES">Notificações</SelectItem>
                    <SelectItem value="SEGURANCA">Segurança</SelectItem>
                    <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newConfig.tipo} onValueChange={v => setNewConfig(c => ({ ...c, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRING">String</SelectItem>
                    <SelectItem value="NUMBER">Número</SelectItem>
                    <SelectItem value="BOOLEAN">Booleano</SelectItem>
                    <SelectItem value="JSON">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Configuração
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
