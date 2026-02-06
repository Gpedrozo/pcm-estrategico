import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  FileCheck,
  History,
  Wrench,
  Users,
  ClipboardList,
  Tag,
  Building2,
  Package,
  MessageSquare,
  Calendar,
  Search,
  Shield,
  TrendingUp,
  FileSearch,
  Lightbulb,
  Truck,
  Inbox,
  CalendarClock,
  Activity,
  DollarSign,
  BarChart3,
  FileArchive,
  Plus,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navigateTo = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    setOpen(false);
  }, [logout]);

  const navigationItems: CommandItem[] = [
    // Principal
    { id: 'dashboard', label: 'Dashboard', description: 'Visão geral e KPIs', icon: LayoutDashboard, action: () => navigateTo('/dashboard'), keywords: ['home', 'inicio', 'principal', 'kpi', 'indicadores'], group: 'Principal' },
    
    // Ordens de Serviço
    { id: 'solicitacoes', label: 'Solicitações', description: 'Gerenciar solicitações de manutenção', icon: MessageSquare, action: () => navigateTo('/solicitacoes'), keywords: ['pedidos', 'requisicoes'], group: 'Ordens de Serviço' },
    { id: 'backlog', label: 'Backlog', description: 'Fila de ordens pendentes', icon: Inbox, action: () => navigateTo('/backlog'), keywords: ['fila', 'pendentes', 'aguardando'], group: 'Ordens de Serviço' },
    { id: 'nova-os', label: 'Emitir O.S', description: 'Criar nova ordem de serviço', icon: FilePlus, action: () => navigateTo('/os/nova'), keywords: ['criar', 'nova', 'abrir', 'emitir'], group: 'Ordens de Serviço' },
    { id: 'fechar-os', label: 'Fechar O.S', description: 'Encerrar ordem de serviço', icon: FileCheck, action: () => navigateTo('/os/fechar'), keywords: ['encerrar', 'finalizar', 'concluir'], group: 'Ordens de Serviço' },
    { id: 'historico', label: 'Histórico', description: 'Histórico de ordens de serviço', icon: History, action: () => navigateTo('/os/historico'), keywords: ['passado', 'anteriores', 'registro'], group: 'Ordens de Serviço' },
    
    // Planejamento
    { id: 'programacao', label: 'Programação', description: 'Agenda de manutenção', icon: CalendarClock, action: () => navigateTo('/programacao'), keywords: ['agenda', 'calendario', 'schedule'], group: 'Planejamento' },
    { id: 'preventiva', label: 'Preventiva', description: 'Planos de manutenção preventiva', icon: Calendar, action: () => navigateTo('/preventiva'), keywords: ['planos', 'rotina', 'periodica'], group: 'Planejamento' },
    { id: 'preditiva', label: 'Preditiva', description: 'Monitoramento preditivo', icon: Activity, action: () => navigateTo('/preditiva'), keywords: ['monitoramento', 'condicao', 'sensores'], group: 'Planejamento' },
    { id: 'inspecoes', label: 'Inspeções', description: 'Rotas de inspeção', icon: Search, action: () => navigateTo('/inspecoes'), keywords: ['rotas', 'verificacao', 'checklist'], group: 'Planejamento' },
    
    // Análises
    { id: 'fmea', label: 'FMEA/RCM', description: 'Análise de modos de falha', icon: FileSearch, action: () => navigateTo('/fmea'), keywords: ['falhas', 'riscos', 'rcm', 'confiabilidade'], group: 'Análises' },
    { id: 'rca', label: 'Causa Raiz', description: 'Análise de causa raiz', icon: TrendingUp, action: () => navigateTo('/rca'), keywords: ['ishikawa', '5porques', 'problema'], group: 'Análises' },
    { id: 'melhorias', label: 'Melhorias', description: 'Projetos de melhoria', icon: Lightbulb, action: () => navigateTo('/melhorias'), keywords: ['kaizen', 'otimizacao', 'projetos'], group: 'Análises' },
    
    // Cadastros
    { id: 'hierarquia', label: 'Hierarquia', description: 'Estrutura organizacional', icon: Building2, action: () => navigateTo('/hierarquia'), keywords: ['planta', 'area', 'sistema', 'estrutura'], group: 'Cadastros' },
    { id: 'equipamentos', label: 'Equipamentos', description: 'Cadastro de ativos', icon: Tag, action: () => navigateTo('/equipamentos'), keywords: ['ativos', 'maquinas', 'tags'], group: 'Cadastros' },
    { id: 'mecanicos', label: 'Mecânicos', description: 'Equipe de manutenção', icon: Wrench, action: () => navigateTo('/mecanicos'), keywords: ['tecnicos', 'equipe', 'manutentores'], group: 'Cadastros' },
    { id: 'materiais', label: 'Materiais', description: 'Estoque e peças', icon: Package, action: () => navigateTo('/materiais'), keywords: ['estoque', 'pecas', 'almoxarifado'], group: 'Cadastros' },
    { id: 'fornecedores', label: 'Fornecedores', description: 'Cadastro de fornecedores', icon: Truck, action: () => navigateTo('/fornecedores'), keywords: ['terceiros', 'prestadores', 'empresas'], group: 'Cadastros' },
    { id: 'contratos', label: 'Contratos', description: 'Gestão de contratos', icon: FileText, action: () => navigateTo('/contratos'), keywords: ['acordos', 'sla', 'terceirizacao'], group: 'Cadastros' },
    { id: 'documentos', label: 'Documentos', description: 'Documentos técnicos', icon: FileArchive, action: () => navigateTo('/documentos'), keywords: ['manuais', 'procedimentos', 'pop'], group: 'Cadastros' },
    
    // Relatórios
    { id: 'custos', label: 'Custos', description: 'Análise de custos', icon: DollarSign, action: () => navigateTo('/custos'), keywords: ['financeiro', 'gastos', 'orcamento'], group: 'Relatórios' },
    { id: 'relatorios', label: 'Relatórios', description: 'Relatórios gerenciais', icon: BarChart3, action: () => navigateTo('/relatorios'), keywords: ['graficos', 'indicadores', 'exportar'], group: 'Relatórios' },
    
    // Segurança
    { id: 'ssma', label: 'SSMA', description: 'Segurança, Saúde e Meio Ambiente', icon: Shield, action: () => navigateTo('/ssma'), keywords: ['seguranca', 'incidentes', 'epi', 'permissao'], group: 'SSMA' },
  ];

  const adminItems: CommandItem[] = [
    { id: 'usuarios', label: 'Usuários', description: 'Gerenciar usuários do sistema', icon: Users, action: () => navigateTo('/usuarios'), keywords: ['pessoas', 'acessos', 'permissoes'], group: 'Administração' },
    { id: 'auditoria', label: 'Auditoria', description: 'Logs de auditoria', icon: ClipboardList, action: () => navigateTo('/auditoria'), keywords: ['logs', 'historico', 'acoes'], group: 'Administração' },
  ];

  const quickActions: CommandItem[] = [
    { id: 'quick-nova-os', label: 'Nova O.S Corretiva', description: 'Criar ordem de serviço corretiva rapidamente', icon: Plus, action: () => navigateTo('/os/nova'), keywords: ['criar', 'rapido', 'corretiva'], group: 'Ações Rápidas' },
    { id: 'quick-logout', label: 'Sair do Sistema', description: 'Encerrar sessão', icon: LogOut, action: handleLogout, keywords: ['logout', 'desconectar', 'sair'], group: 'Ações Rápidas' },
  ];

  const allItems = [...navigationItems, ...(isAdmin ? adminItems : []), ...quickActions];

  // Group items by their group
  const groupedItems = allItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite para buscar páginas, ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        {Object.entries(groupedItems).map(([group, items], index) => (
          <div key={group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.description} ${item.keywords?.join(' ')}`}
                  onSelect={item.action}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
