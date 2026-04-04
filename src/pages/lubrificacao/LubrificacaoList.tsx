import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Eye, Trash2 } from 'lucide-react';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import type { PlanoLubrificacao } from '@/types/lubrificacao';

interface LubrificacaoListProps {
  planos: PlanoLubrificacao[];
  equipamentos: EquipamentoRow[];
  search: string;
  equipamentoFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onEquipamentoFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelect: (plano: PlanoLubrificacao) => void;
  onEdit: (plano: PlanoLubrificacao) => void;
  onDelete: (plano: PlanoLubrificacao) => void;
}

export function LubrificacaoList({
  planos,
  equipamentos,
  search,
  equipamentoFilter,
  statusFilter,
  onSearchChange,
  onEquipamentoFilterChange,
  onStatusFilterChange,
  onSelect,
  onEdit,
  onDelete,
}: LubrificacaoListProps) {
  const equipamentoNome = (equipamentoId: string | null) => {
    if (!equipamentoId) return '—';
    const equipamento = equipamentos.find((item) => item.id === equipamentoId);
    return equipamento ? `${equipamento.tag} - ${equipamento.nome}` : '—';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planos de Lubrificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Buscar por código, descrição ou lubrificante..." value={search} onChange={(e) => onSearchChange(e.target.value)} />

          <Select value={equipamentoFilter} onValueChange={onEquipamentoFilterChange}>
            <SelectTrigger><SelectValue placeholder="Filtrar equipamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os equipamentos</SelectItem>
              {equipamentos.filter((item) => item.ativo).map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.tag} - {item.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger><SelectValue placeholder="Filtrar status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="programado">Programado</SelectItem>
              <SelectItem value="executado">Executado</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="table-industrial">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Equipamento</th>
                <th>Status</th>
                <th>Próxima Execução</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {planos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum plano encontrado com os filtros aplicados.</td>
                </tr>
              ) : (
                planos.map((plano) => (
                  <tr key={plano.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(plano)}>
                    <td className="font-mono font-semibold text-primary">{plano.codigo}</td>
                    <td>{plano.nome}</td>
                    <td>
                      <div className="space-y-0.5">
                        <p>{equipamentoNome(plano.equipamento_id)}</p>
                      </div>
                    </td>
                    <td>
                      <Badge variant="outline">{plano.status || 'programado'}</Badge>
                    </td>
                    <td>{plano.proxima_execucao ? new Date(plano.proxima_execucao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => onSelect(plano)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onEdit(plano)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(plano)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
