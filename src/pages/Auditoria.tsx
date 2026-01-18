import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuditoria } from '@/hooks/useAuditoria';
import { Search, Filter, ClipboardList, User, Clock, Tag, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const acaoLabels: Record<string, { label: string; color: string }> = {
  LOGIN: { label: 'Login', color: 'bg-info/10 text-info' },
  LOGOUT: { label: 'Logout', color: 'bg-muted text-muted-foreground' },
  CRIAR_OS: { label: 'Criar O.S', color: 'bg-success/10 text-success' },
  FECHAR_OS: { label: 'Fechar O.S', color: 'bg-primary/10 text-primary' },
  IMPRIMIR_OS: { label: 'Imprimir', color: 'bg-warning/10 text-warning' },
  GERAR_PDF: { label: 'Gerar PDF', color: 'bg-warning/10 text-warning' },
  CRIAR_USUARIO: { label: 'Criar Usuário', color: 'bg-success/10 text-success' },
  EDITAR_USUARIO: { label: 'Editar Usuário', color: 'bg-info/10 text-info' },
  CRIAR_PLANO_PREVENTIVO: { label: 'Criar Plano', color: 'bg-info/10 text-info' },
  EXECUTAR_PLANO_PREVENTIVO: { label: 'Executar Plano', color: 'bg-info/10 text-info' },
  CADASTRAR_MATERIAL: { label: 'Cadastrar Material', color: 'bg-success/10 text-success' },
  AJUSTAR_ESTOQUE: { label: 'Ajustar Estoque', color: 'bg-warning/10 text-warning' },
};

export default function Auditoria() {
  const [filters, setFilters] = useState({
    usuario: '',
    acao: '',
    search: '',
  });

  const { data: auditoria, isLoading, error } = useAuditoria();

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const filteredAuditoria = auditoria?.filter(log => {
    if (filters.usuario && log.usuario_nome !== filters.usuario) return false;
    if (filters.acao && log.acao !== filters.acao) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !log.descricao.toLowerCase().includes(searchLower) &&
        !log.usuario_nome.toLowerCase().includes(searchLower) &&
        !(log.tag?.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }
    return true;
  }) || [];

  // Get unique users for filter
  const uniqueUsers = [...new Set(auditoria?.map(log => log.usuario_nome) || [])];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Erro ao carregar auditoria</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoria do Sistema</h1>
        <p className="text-muted-foreground">Registro de todas as ações realizadas no sistema</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Descrição, usuário, TAG..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select 
              value={filters.usuario || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, usuario: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ação</Label>
            <Select 
              value={filters.acao || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, acao: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(acaoLabels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ usuario: '', acao: '', search: '' })}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredAuditoria.length} registro{filteredAuditoria.length !== 1 ? 's' : ''} encontrado{filteredAuditoria.length !== 1 ? 's' : ''}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredAuditoria.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum registro encontrado</p>
          </div>
        ) : (
          filteredAuditoria.map((log) => {
            const acaoConfig = acaoLabels[log.acao] || { label: log.acao, color: 'bg-muted text-muted-foreground' };
            return (
              <div
                key={log.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-industrial transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${acaoConfig.color}`}>
                        {acaoConfig.label}
                      </span>
                      {log.tag && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-primary">
                          <Tag className="h-3 w-3" />
                          {log.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-foreground">{log.descricao}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {log.usuario_nome}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(log.data_hora)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
