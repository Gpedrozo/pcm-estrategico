import { useEffect, useState } from 'react';
import {
  LayoutDashboard, 
  FileText, 
  FilePlus, 
  FileCheck, 
  History, 
  Wrench, 
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
  Droplet,
  HardHat,
  UserCircle,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useBranding } from '@/contexts/BrandingContext';
import { useOptionalTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupportTickets } from '@/hooks/useSupportTickets';
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
import { InstaladorAPKDialog } from '@/components/ajuda/InstaladorAPKDialog';

const mainMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

const osMenuItems = [
  { title: 'Solicitações', url: '/solicitacoes', icon: MessageSquare },
  { title: 'Backlog', url: '/backlog', icon: Inbox },
  { title: 'Emitir O.S', url: '/os/nova', icon: FilePlus },
  { title: 'Fechar O.S', url: '/os/fechar', icon: FileCheck },
  { title: 'Portal Mecânico', url: '/os/portal-mecanico', icon: HardHat },
  { title: 'Histórico', url: '/os/historico', icon: History },
];

const operadorMenuItems = [
  { title: 'Painel do Operador', url: '/painel-operador', icon: UserCircle },
  { title: 'Solicitações', url: '/solicitacoes', icon: MessageSquare },
];

const mecanicoMenuItems = [
  { title: 'Portal Mecânico', url: '/os/portal-mecanico', icon: HardHat },
  { title: 'Solicitações', url: '/solicitacoes', icon: MessageSquare },
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
  { title: 'Catálogos Técnicos', url: '/documentos', icon: FileArchive },
];

const relatoriosMenuItems = [
  { title: 'Custos', url: '/custos', icon: DollarSign },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
];

const ssmaMenuItems = [
  { title: 'SSMA', url: '/ssma', icon: Shield },
];

const ajudaMenuItems = [
  { title: 'Suporte', url: '/suporte', icon: MessageSquare },
  { title: 'Manuais de Operação', url: '/manuais-operacao', icon: FileText },
];

const adminMenuItems = [
  { title: 'Central Admin', url: '/administracao', icon: Settings },
];

const masterTIMenuItems = [
  { title: 'Master TI', url: '/master-ti', icon: Monitor },
];

export function AppSidebar() {
  const { user, logout, isAdmin, isMasterTI, effectiveRole } = useAuth();
  const { isSidebarItemVisible } = useModuleAccess();
  const { branding } = useBranding();
  const tenantContext = useOptionalTenant();
  const tenant = tenantContext?.tenant ?? null;
  const location = useLocation();
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string | null>(null);
  const [instaladorOpen, setInstaladorOpen] = useState(false);

  const { data: supportTickets } = useSupportTickets();
  const unreadClientCount = (supportTickets ?? []).reduce(
    (sum, t) => sum + (t.unread_client_messages ?? 0),
    0,
  );

  useEffect(() => {
    let isMounted = true;

    const loadCompanyName = async () => {
      if (!user?.tenantId) {
        if (isMounted) setResolvedCompanyName(null);
        return;
      }

      const { data } = await supabase
        .from('empresas')
        .select('nome')
        .eq('id', user.tenantId)
        .maybeSingle();

      if (!isMounted) return;
      setResolvedCompanyName(data?.nome ?? null);
    };

    void loadCompanyName();

    return () => {
      isMounted = false;
    };
  }, [user?.tenantId]);

  const activeCompanyName =
    branding?.nome_fantasia
    || branding?.razao_social
    || resolvedCompanyName
    || tenant?.name
    || null;

  const isActive = (path: string) => location.pathname === path;

  const isSolicitanteOnly = effectiveRole === 'SOLICITANTE';
  const isTechnicianOnly = effectiveRole === 'TECHNICIAN';
  const _isUsuarioOrBelow = isSolicitanteOnly || effectiveRole === 'USUARIO';
  const _isAdminOrAbove = isAdmin || effectiveRole === 'MASTER_TI' || effectiveRole === 'SYSTEM_OWNER' || effectiveRole === 'SYSTEM_ADMIN';
  const isRestrictedRole = isSolicitanteOnly || isTechnicianOnly;

  const filterByModule = (items: { title: string; url: string; icon: React.ElementType }[]) =>
    items.filter((item) => isSidebarItemVisible(item.url));

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
          {item.url === '/suporte' && unreadClientCount > 0 && (
            <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
              {unreadClientCount > 99 ? '99+' : unreadClientCount}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {branding?.logo_menu_url ? (
            <img
              src={branding.logo_menu_url}
              alt={branding.nome_fantasia || branding.razao_social || 'Logo'}
              className="w-10 h-10 rounded-md object-contain"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-sidebar-primary flex items-center justify-center">
              <Settings className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">
              {branding?.nome_fantasia || branding?.razao_social || 'PCM ESTRATÉGICO'}
            </h1>
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
              {isSolicitanteOnly
                ? filterByModule(operadorMenuItems).map(renderMenuLink)
                : isTechnicianOnly
                  ? filterByModule(mecanicoMenuItems).map(renderMenuLink)
                  : filterByModule(osMenuItems).map(renderMenuLink)
              }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isRestrictedRole && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              Planejamento
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByModule(planejamentoMenuItems).map(renderMenuLink)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isRestrictedRole && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              Análises
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByModule(analisesMenuItems).map(renderMenuLink)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isRestrictedRole && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              Catálogos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByModule(cadastroMenuItems).map(renderMenuLink)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isRestrictedRole && (
          <>
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
                Relatórios
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filterByModule(relatoriosMenuItems).map(renderMenuLink)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
                Segurança
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filterByModule(ssmaMenuItems).map(renderMenuLink)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
            Ajuda
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ajudaMenuItems.map(renderMenuLink)}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => setInstaladorOpen(true)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                  >
                    <Smartphone className="h-5 w-5" />
                    <span>Instalador</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <InstaladorAPKDialog open={instaladorOpen} onOpenChange={setInstaladorOpen} />

        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map(renderMenuLink)}
                {isMasterTI && masterTIMenuItems.map(renderMenuLink)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isMasterTI && !isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold px-3 mb-2">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {masterTIMenuItems.map(renderMenuLink)}
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
              {activeCompanyName && (
                <span className="text-xs text-sidebar-foreground/70">{activeCompanyName}</span>
              )}
              <span className="text-[11px] text-sidebar-foreground/50">{user?.tipo}</span>
            </div>
          </div>
          <button
            onClick={() => { logout() }}
            className="p-2 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            title="Sair"
            aria-label="Sair do sistema"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
