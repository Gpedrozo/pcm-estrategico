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
  LogOut,
  Settings,
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
  Crown
  ,Droplet
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const mainMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

const osMenuItems = [
  { title: 'Solicitações', url: '/solicitacoes', icon: MessageSquare },
  { title: 'Backlog', url: '/backlog', icon: Inbox },
  { title: 'Emitir O.S', url: '/os/nova', icon: FilePlus },
  { title: 'Fechar O.S', url: '/os/fechar', icon: FileCheck },
  { title: 'Histórico', url: '/os/historico', icon: History },
];

const planejamentoMenuItems = [
  { title: 'Lubrificação', url: '/lubrificacao', icon: Droplet },
  { title: 'Programação', url: '/programacao', icon: CalendarClock },
  { title: 'Preventiva', url: '/preventiva', icon: Calendar },
  { title: 'Preditiva', url: '/preditiva', icon: Activity },
  { title: 'Inspeções', url: '/inspecoes', icon: Search },
];

const analisesMenuItems = [
  { title: 'FMEA/RCM', url: '/fmea', icon: FileSearch },
  { title: 'Causa Raiz', url: '/rca', icon: TrendingUp },
  { title: 'Inteligência IA', url: '/inteligencia-causa-raiz', icon: Activity },
  { title: 'Melhorias', url: '/melhorias', icon: Lightbulb },
];

const cadastroMenuItems = [
  { title: 'Hierarquia', url: '/hierarquia', icon: Building2 },
  { title: 'Equipamentos', url: '/equipamentos', icon: Tag },
  { title: 'Mecânicos', url: '/mecanicos', icon: Wrench },
  { title: 'Materiais', url: '/materiais', icon: Package },
  { title: 'Fornecedores', url: '/fornecedores', icon: Truck },
  { title: 'Contratos', url: '/contratos', icon: FileText },
  { title: 'Documentos', url: '/documentos', icon: FileArchive },
];

const relatoriosMenuItems = [
  { title: 'Custos', url: '/custos', icon: DollarSign },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
];

const ssmaMenuItems = [
  { title: 'SSMA', url: '/ssma', icon: Shield },
];

const adminMenuItems = [
  { title: 'Usuários', url: '/usuarios', icon: Users },
  { title: 'Auditoria', url: '/auditoria', icon: ClipboardList },
];

export function AppSidebar() {
  const { user, logout, isAdmin, isMasterTI, isSystemOwner } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const renderMenuLink = (item: { title: string; url: string; icon: React.ElementType }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild>
        <NavLink 
          to={item.url}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
            isActive(item.url) 
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-sidebar-primary flex items-center justify-center">
            <Settings className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">PCM ESTRATÉGICO</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema de Manutenção</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map(renderMenuLink)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Ordens de Serviço
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {osMenuItems.map(renderMenuLink)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Planejamento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planejamentoMenuItems.map(renderMenuLink)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Análises
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analisesMenuItems.map(renderMenuLink)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Cadastros
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cadastroMenuItems.map(renderMenuLink)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Relatórios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {relatoriosMenuItems.map(renderMenuLink)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Segurança
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ssmaMenuItems.map(renderMenuLink)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map(renderMenuLink)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isMasterTI && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              Master TI
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderMenuLink({ title: 'Painel Master', url: '/master-ti', icon: Crown })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSystemOwner && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              System Owner
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderMenuLink({ title: 'Owner Portal', url: '/owner', icon: Shield })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-accent-foreground">
                {user?.nome.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{user?.nome}</span>
              <span className="text-xs text-sidebar-foreground/60">{user?.tipo}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
