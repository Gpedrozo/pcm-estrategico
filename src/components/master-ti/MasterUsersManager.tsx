import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Edit, Shield, User, Crown, Eye, Wrench, Loader2, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type AppRole = 'MASTER_TI' | 'ADMIN' | 'USUARIO';

interface UserData {
  id: string;
  nome: string;
  role: AppRole;
  created_at: string;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  MASTER_TI: { label: 'Master TI', icon: Crown, color: 'bg-destructive/10 text-destructive border-destructive/20' },
  ADMIN: { label: 'Administrador', icon: Shield, color: 'bg-primary/10 text-primary border-primary/20' },
  USUARIO: { label: 'Usuário', icon: User, color: 'bg-secondary text-secondary-foreground border-border' },
};

export function MasterUsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formRole, setFormRole] = useState<AppRole>('USUARIO');
  const [formNome, setFormNome] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['master-users'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').order('nome');
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await supabase.from('user_roles').select('*');
      if (rErr) throw rErr;
      return (profiles || []).map(p => {
        const r = roles?.find(r => r.user_id === p.id);
        return { id: p.id, nome: p.nome, role: (r?.role || 'USUARIO') as AppRole, created_at: p.created_at };
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, role, nome }: { userId: string; role: AppRole; nome: string }) => {
      const { error: nErr } = await supabase.from('profiles').update({ nome }).eq('id', userId);
      if (nErr) throw nErr;
      const { error: rErr } = await supabase.from('user_roles').update({ role }).eq('user_id', userId);
      if (rErr) throw rErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-users'] });
      toast({ title: 'Usuário atualizado', description: 'Dados salvos com sucesso.' });
      setEditingUser(null);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const filtered = users?.filter(u => !search || u.nome.toLowerCase().includes(search.toLowerCase())) || [];
  const stats = {
    total: users?.length || 0,
    masters: users?.filter(u => u.role === 'MASTER_TI').length || 0,
    admins: users?.filter(u => u.role === 'ADMIN').length || 0,
    users: users?.filter(u => u.role === 'USUARIO').length || 0,
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, bg: 'bg-muted' },
          { label: 'Master TI', value: stats.masters, icon: Crown, bg: 'bg-destructive/10' },
          { label: 'Admins', value: stats.admins, icon: Shield, bg: 'bg-primary/10' },
          { label: 'Usuários', value: stats.users, icon: User, bg: 'bg-secondary' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="table-industrial w-full">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Criado em</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : (
                filtered.map(user => {
                  const cfg = ROLE_CONFIG[user.role];
                  const Icon = cfg.icon;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${user.role === 'MASTER_TI' ? 'bg-destructive/10' : user.role === 'ADMIN' ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{user.nome}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                      </td>
                      <td className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setFormRole(user.role); setFormNome(user.nome); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (editingUser) updateMutation.mutate({ userId: editingUser.id, role: formRole, nome: formNome }); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={formRole} onValueChange={v => setFormRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="MASTER_TI">Master TI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
