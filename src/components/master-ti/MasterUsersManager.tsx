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
import { Search, Edit, Shield, User, Crown, Loader2, Users, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogAuditoria } from '@/hooks/useAuditoria';

type AppRole = 'MASTER_TI' | 'ADMIN' | 'USUARIO';

interface UserData {
  id: string;
  nome: string;
  role: AppRole;
  created_at: string;
  updated_at?: string;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  MASTER_TI: { label: 'Master TI', icon: Crown, color: 'bg-destructive/10 text-destructive border-destructive/20' },
  ADMIN: { label: 'Administrador', icon: Shield, color: 'bg-primary/10 text-primary border-primary/20' },
  USUARIO: { label: 'Usuário', icon: User, color: 'bg-secondary text-secondary-foreground border-border' },
};

const PAGE_SIZE = 15;

export function MasterUsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { log } = useLogAuditoria();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [viewingUser, setViewingUser] = useState<UserData | null>(null);
  const [formRole, setFormRole] = useState<AppRole>('USUARIO');
  const [formNome, setFormNome] = useState('');
  const [page, setPage] = useState(0);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['master-users'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').order('nome');
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await supabase.from('user_roles').select('*');
      if (rErr) throw rErr;
      return (profiles || []).map(p => {
        const r = roles?.find(r => r.user_id === p.id);
        return { id: p.id, nome: p.nome, role: (r?.role || 'USUARIO') as AppRole, created_at: p.created_at, updated_at: p.updated_at };
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
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['master-users'] });
      toast({ title: 'Usuário atualizado com sucesso.' });
      log('EDITAR_USUARIO', `Usuário "${vars.nome}" atualizado para perfil ${vars.role}`, 'MASTER_TI');
      setEditingUser(null);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const filtered = users?.filter(u => {
    const matchSearch = !search || u.nome.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  }) || [];

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = {
    total: users?.length || 0,
    masters: users?.filter(u => u.role === 'MASTER_TI').length || 0,
    admins: users?.filter(u => u.role === 'ADMIN').length || 0,
    users: users?.filter(u => u.role === 'USUARIO').length || 0,
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (error) return <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Erro ao carregar usuários: {(error as Error).message}</div>;

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
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os perfis</SelectItem>
            <SelectItem value="MASTER_TI">Master TI</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="USUARIO">Usuário</SelectItem>
          </SelectContent>
        </Select>
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
                <th>Última Atualização</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : (
                paged.map(user => {
                  const cfg = ROLE_CONFIG[user.role];
                  const Icon = cfg.icon;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${user.role === 'MASTER_TI' ? 'bg-destructive/10' : user.role === 'ADMIN' ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-medium block">{user.nome}</span>
                            <span className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td><Badge variant="outline" className={cfg.color}>{cfg.label}</Badge></td>
                      <td className="text-muted-foreground text-sm">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="text-muted-foreground text-sm">{user.updated_at ? new Date(user.updated_at).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingUser(user)} title="Detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setFormRole(user.role); setFormNome(user.nome); }} title="Editar"><Edit className="h-4 w-4" /></Button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={open => !open && setViewingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Usuário</DialogTitle></DialogHeader>
          {viewingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className={`p-3 rounded-full ${viewingUser.role === 'MASTER_TI' ? 'bg-destructive/10' : viewingUser.role === 'ADMIN' ? 'bg-primary/10' : 'bg-secondary'}`}>
                  {(() => { const I = ROLE_CONFIG[viewingUser.role].icon; return <I className="h-6 w-6" />; })()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{viewingUser.nome}</h3>
                  <Badge variant="outline" className={ROLE_CONFIG[viewingUser.role].color}>{ROLE_CONFIG[viewingUser.role].label}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label className="text-muted-foreground">ID</Label><p className="font-mono text-xs mt-1">{viewingUser.id}</p></div>
                <div><Label className="text-muted-foreground">Criado em</Label><p className="mt-1">{new Date(viewingUser.created_at).toLocaleString('pt-BR')}</p></div>
                <div><Label className="text-muted-foreground">Atualizado em</Label><p className="mt-1">{viewingUser.updated_at ? new Date(viewingUser.updated_at).toLocaleString('pt-BR') : '—'}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
