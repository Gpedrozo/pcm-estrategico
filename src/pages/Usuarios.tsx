import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUsuarios, useUpdateUsuarioRole, useUpdateUsuarioNome, type UsuarioCompleto } from '@/hooks/useUsuarios';
import { Search, Edit, Shield, User as UserIcon, AlertTriangle, Loader2, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'ADMIN' | 'USUARIO' | 'MASTER_TI';

const ROLE_LABELS: Record<UserRole, string> = {
  MASTER_TI: 'Master TI',
  ADMIN: 'Administrador',
  USUARIO: 'Usuário',
};

export default function Usuarios() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioCompleto | null>(null);
  const [formData, setFormData] = useState({ 
    nome: '', 
    role: '' as UserRole | '' 
  });

  const { data: usuarios, isLoading, error } = useUsuarios();
  const updateRoleMutation = useUpdateUsuarioRole();
  const updateNomeMutation = useUpdateUsuarioNome();

  const filteredUsers = usuarios?.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return user.nome.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Update name if changed
    if (formData.nome !== editingUser.nome) {
      await updateNomeMutation.mutateAsync({ 
        userId: editingUser.id, 
        nome: formData.nome 
      });
    }

    // Update role if changed
    if (formData.role && formData.role !== editingUser.role) {
      await updateRoleMutation.mutateAsync({ 
        userId: editingUser.id, 
        role: formData.role 
      });
    }

    setIsModalOpen(false);
    setFormData({ nome: '', role: '' });
    setEditingUser(null);
  };

  const handleEdit = (user: UsuarioCompleto) => {
    setEditingUser(user);
    setFormData({ nome: user.nome, role: user.role });
    setIsModalOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Erro ao carregar usuários</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const isPending = updateRoleMutation.isPending || updateNomeMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">
            Gerenciamento de usuários do sistema • {usuarios?.length || 0} registros
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-info/10 border border-info/20 rounded-lg p-4 text-sm text-info">
        <p>
          <strong>Nota:</strong> Novos usuários são criados automaticamente através do cadastro na tela de login. 
          Aqui você pode gerenciar os perfis de acesso (Admin/Usuário) dos usuários existentes.
        </p>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Perfil</th>
              <th>Criado em</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        user.role === 'MASTER_TI' ? 'bg-destructive/10' : user.role === 'ADMIN' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {user.role === 'MASTER_TI' ? (
                          <Shield className="h-4 w-4 text-destructive" />
                        ) : user.role === 'ADMIN' ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium">{user.nome}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                      user.role === 'MASTER_TI'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : user.role === 'ADMIN'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do usuário"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Perfil de Acesso *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="MASTER_TI">Master TI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={!formData.nome || !formData.role || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
