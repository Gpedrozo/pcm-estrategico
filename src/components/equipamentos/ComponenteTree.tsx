import { useState } from 'react';
import { ChevronRight, ChevronDown, Settings2, Edit, Trash2, Copy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ComponenteEquipamento, 
  TIPOS_COMPONENTE, 
  ESTADOS_COMPONENTE 
} from '@/hooks/useComponentesEquipamento';
import { cn } from '@/lib/utils';

interface ComponenteTreeProps {
  componentes: ComponenteEquipamento[];
  onEdit: (componente: ComponenteEquipamento) => void;
  onDelete: (componente: ComponenteEquipamento) => void;
  onDuplicate: (componente: ComponenteEquipamento) => void;
  onAddChild: (parentId: string) => void;
  isAdmin: boolean;
}

interface TreeNodeProps {
  componente: ComponenteEquipamento;
  level: number;
  onEdit: (componente: ComponenteEquipamento) => void;
  onDelete: (componente: ComponenteEquipamento) => void;
  onDuplicate: (componente: ComponenteEquipamento) => void;
  onAddChild: (parentId: string) => void;
  isAdmin: boolean;
}

function TreeNode({ 
  componente, 
  level, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onAddChild,
  isAdmin 
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = componente.children && componente.children.length > 0;
  
  const tipoLabel = TIPOS_COMPONENTE.find(t => t.value === componente.tipo)?.label || componente.tipo;
  const estadoInfo = ESTADOS_COMPONENTE.find(e => e.value === componente.estado);

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group",
          !componente.ativo && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {componente.codigo}
            </span>
            <span className="font-medium truncate">{componente.nome}</span>
            <Badge variant="outline" className="text-xs">
              {tipoLabel}
            </Badge>
            {componente.quantidade > 1 && (
              <Badge variant="secondary" className="text-xs">
                x{componente.quantidade}
              </Badge>
            )}
            {estadoInfo && (
              <div className={cn("w-2 h-2 rounded-full", estadoInfo.color)} title={estadoInfo.label} />
            )}
          </div>
          
          {(componente.fabricante || componente.modelo) && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {[componente.fabricante, componente.modelo].filter(Boolean).join(' - ')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddChild(componente.id)}
            title="Adicionar subcomponente"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDuplicate(componente)}
            title="Duplicar"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(componente)}
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(componente)}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {componente.children!.map(child => (
            <TreeNode
              key={child.id}
              componente={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onAddChild={onAddChild}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ComponenteTree({
  componentes,
  onEdit,
  onDelete,
  onDuplicate,
  onAddChild,
  isAdmin,
}: ComponenteTreeProps) {
  if (componentes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum componente cadastrado</p>
        <p className="text-sm">Clique em "Novo Componente" para adicionar</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {componentes.map(componente => (
        <TreeNode
          key={componente.id}
          componente={componente}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onAddChild={onAddChild}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
