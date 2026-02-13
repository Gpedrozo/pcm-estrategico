import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, Loader2, Edit2, X, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-configs'] });
      toast({ title: 'Configuração salva' });
      setEditingId(null);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const grouped = configs?.reduce((acc, c) => {
    const cat = c.categoria || 'GERAL';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {} as Record<string, ConfigItem[]>) || {};

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  if (!configs?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma configuração cadastrada</h3>
          <p className="text-muted-foreground text-sm">As configurações do sistema aparecerão aqui quando forem criadas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              {category}
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
      ))}
    </div>
  );
}
