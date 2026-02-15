import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, ShieldCheck, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissoesUsuario, useSavePermissoes, MODULOS, type PermissaoGranular } from '@/hooks/usePermissoesGranulares';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const PERM_FIELDS_MODULO = [
  { key: 'visualizar', label: 'Visualizar' },
  { key: 'criar', label: 'Criar' },
  { key: 'editar', label: 'Editar' },
  { key: 'excluir', label: 'Excluir' },
  { key: 'alterar_status', label: 'Alterar Status' },
  { key: 'imprimir', label: 'Imprimir' },
  { key: 'exportar', label: 'Exportar' },
  { key: 'importar', label: 'Importar' },
  { key: 'acessar_indicadores', label: 'Indicadores' },
  { key: 'acessar_historico', label: 'Histórico' },
] as const;

const PERM_FIELDS_SENSIVEIS = [
  { key: 'ver_valores', label: 'Ver Valores' },
  { key: 'ver_custos', label: 'Ver Custos' },
  { key: 'ver_criticidade', label: 'Ver Criticidade' },
  { key: 'ver_status', label: 'Ver Status' },
  { key: 'ver_obs_internas', label: 'Obs. Internas' },
  { key: 'ver_dados_financeiros', label: 'Dados Financeiros' },
] as const;

function useUsersList() {
  return useQuery({
    queryKey: ['admin_users_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, nome');
      if (error) throw error;
      return data;
    },
  });
}

export function MasterPermissionsManager() {
  const { data: users, isLoading: loadingUsers } = useUsersList();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const { data: existingPerms, isLoading: loadingPerms } = usePermissoesUsuario(selectedUser || undefined);
  const saveMutation = useSavePermissoes();

  // Local state for permission editing
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (existingPerms) {
      const map: Record<string, Record<string, boolean>> = {};
      existingPerms.forEach(p => {
        const { id, user_id, modulo, ...boolFields } = p;
        map[modulo] = boolFields;
      });
      // Ensure all modules exist
      MODULOS.forEach(m => {
        if (!map[m]) {
          map[m] = { visualizar: true, criar: false, editar: false, excluir: false, alterar_status: false, imprimir: false, exportar: false, importar: false, acessar_indicadores: false, acessar_historico: false, ver_valores: false, ver_custos: false, ver_criticidade: true, ver_status: true, ver_obs_internas: false, ver_dados_financeiros: false };
        }
      });
      setPerms(map);
    }
  }, [existingPerms]);

  const togglePerm = (modulo: string, field: string) => {
    setPerms(prev => ({
      ...prev,
      [modulo]: { ...prev[modulo], [field]: !prev[modulo]?.[field] },
    }));
  };

  const toggleAllForModule = (modulo: string, value: boolean) => {
    const all: Record<string, boolean> = {};
    [...PERM_FIELDS_MODULO, ...PERM_FIELDS_SENSIVEIS].forEach(f => { all[f.key] = value; });
    setPerms(prev => ({ ...prev, [modulo]: all }));
  };

  const handleSave = () => {
    if (!selectedUser) return;
    const permissoes = Object.entries(perms).map(([modulo, fields]) => ({
      modulo,
      ...fields,
    }));
    saveMutation.mutate({ userId: selectedUser, permissoes });
  };

  if (loadingUsers) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Permissões Granulares</h2>
        </div>
        <Button onClick={handleSave} disabled={!selectedUser || saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Permissões
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Selecionar Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {users?.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedUser && !loadingPerms && (
        <ScrollArea className="h-[60vh]">
          <div className="space-y-3">
            {MODULOS.map(modulo => (
              <Card key={modulo}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{modulo}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleAllForModule(modulo, true)}>
                        Marcar Todos
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleAllForModule(modulo, false)}>
                        Desmarcar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {PERM_FIELDS_MODULO.map(field => (
                      <label key={field.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={!!perms[modulo]?.[field.key]}
                          onCheckedChange={() => togglePerm(modulo, field.key)}
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Campos Sensíveis:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {PERM_FIELDS_SENSIVEIS.map(field => (
                        <label key={field.key} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={!!perms[modulo]?.[field.key]}
                            onCheckedChange={() => togglePerm(modulo, field.key)}
                          />
                          {field.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
