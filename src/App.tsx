import { Suspense, useEffect, useRef } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { AppLayout } from "@/components/layout/AppLayout";
import { EnvironmentGuard } from "@/components/guards/EnvironmentGuard";
import { MasterTIGuard } from "@/components/guards/MasterTIGuard";
import { TenantDomainMiddleware } from '@/components/guards/TenantDomainMiddleware';
import { TenantQueryIsolationGuard } from '@/components/guards/TenantQueryIsolationGuard';
import { TenantProvider } from "@/contexts/TenantContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { isOwnerDomain } from "@/lib/security";
import { Loader2 } from 'lucide-react'
import { AppErrorBoundary } from '@/components/runtime/AppErrorBoundary';
import { TelemetryProvider } from '@/components/runtime/TelemetryProvider';
import { initMonitoring } from '@/lib/monitoring';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import OwnerLogin from '@/owner/OwnerLogin';
import Login from './pages/Login';

const Owner = lazyWithRetry(() => import('./pages/Owner'))

const Index = lazyWithRetry(() => import('./pages/Index'))
const ChangePassword = lazyWithRetry(() => import('./pages/ChangePassword'))
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'))
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'))
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'))
const NovaOS = lazyWithRetry(() => import('./pages/NovaOS'))
const FecharOS = lazyWithRetry(() => import('./pages/FecharOS'))
const PortalMecanicoOS = lazyWithRetry(() => import('./pages/PortalMecanicoOS'))
const HistoricoOS = lazyWithRetry(() => import('./pages/HistoricoOS'))
const Equipamentos = lazyWithRetry(() => import('./pages/Equipamentos'))
const Mecanicos = lazyWithRetry(() => import('./pages/Mecanicos'))
const Usuarios = lazyWithRetry(() => import('./pages/Usuarios'))
const Auditoria = lazyWithRetry(() => import('./pages/Auditoria'))
const Suporte = lazyWithRetry(() => import('./pages/Suporte'))
const Hierarquia = lazyWithRetry(() => import('./pages/Hierarquia'))
const Materiais = lazyWithRetry(() => import('./pages/Materiais'))
const Solicitacoes = lazyWithRetry(() => import('./pages/Solicitacoes'))
const Preventiva = lazyWithRetry(() => import('./pages/Preventiva'))
const Inspecoes = lazyWithRetry(() => import('./pages/Inspecoes'))
const FMEA = lazyWithRetry(() => import('./pages/FMEA'))
const RCA = lazyWithRetry(() => import('./pages/RCA'))
const SSMA = lazyWithRetry(() => import('./pages/SSMA'))
const Melhorias = lazyWithRetry(() => import('./pages/Melhorias'))
const Fornecedores = lazyWithRetry(() => import('./pages/Fornecedores'))
const Contratos = lazyWithRetry(() => import('./pages/Contratos'))
const Backlog = lazyWithRetry(() => import('./pages/Backlog'))
const Programacao = lazyWithRetry(() => import('./pages/Programacao'))
const Preditiva = lazyWithRetry(() => import('./pages/Preditiva'))
const Custos = lazyWithRetry(() => import('./pages/Custos'))
const Relatorios = lazyWithRetry(() => import('./pages/Relatorios'))
const DocumentosTecnicos = lazyWithRetry(() => import('./pages/DocumentosTecnicos'))
const ConfiguracoesEmpresa = lazyWithRetry(() => import('./pages/ConfiguracoesEmpresa'))
const Administracao = lazyWithRetry(() => import('./pages/Administracao'))
const MasterTI = lazyWithRetry(() => import('./pages/MasterTI'))
const Lubrificacao = lazyWithRetry(() => import('./pages/Lubrificacao'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))
const Instalar = lazyWithRetry(() => import('./pages/Instalar'))
const ArquivosOwner = lazyWithRetry(() => import('./pages/ArquivosOwner'))
const RootCauseAIPage = lazyWithRetry(() => import('./modules/rootCauseAI/RootCauseAIPage'))
const ManualOperacao = lazyWithRetry(() => import('./pages/ManualOperacao'))
const SystemStatus = lazyWithRetry(() => import('./pages/SystemStatus'))

// Manual de Operação v2 (22 chapters)
const ManualLayout = lazyWithRetry(() => import('./components/manual/ManualLayout'))
const ManualCover = lazyWithRetry(() => import('./pages/manual/ManualCover'))
const ManualLogin = lazyWithRetry(() => import('./pages/manual/ManualLogin'))
const ManualPerfis = lazyWithRetry(() => import('./pages/manual/ManualPerfis'))
const ManualSolicitacoes = lazyWithRetry(() => import('./pages/manual/ManualSolicitacoes'))
const ManualBacklog = lazyWithRetry(() => import('./pages/manual/ManualBacklog'))
const ManualEmitirOS = lazyWithRetry(() => import('./pages/manual/ManualEmitirOS'))
const ManualFecharOS = lazyWithRetry(() => import('./pages/manual/ManualFecharOS'))
const ManualHistorico = lazyWithRetry(() => import('./pages/manual/ManualHistorico'))
const ManualProgramacao = lazyWithRetry(() => import('./pages/manual/ManualProgramacao'))
const ManualPreventiva = lazyWithRetry(() => import('./pages/manual/ManualPreventiva'))
const ManualPreditiva = lazyWithRetry(() => import('./pages/manual/ManualPreditiva'))
const ManualLubrificacao = lazyWithRetry(() => import('./pages/manual/ManualLubrificacao'))
const ManualInspecoes = lazyWithRetry(() => import('./pages/manual/ManualInspecoes'))
const ManualFMEAPage = lazyWithRetry(() => import('./pages/manual/ManualFMEA'))
const ManualRCAPage = lazyWithRetry(() => import('./pages/manual/ManualRCA'))
const ManualIA = lazyWithRetry(() => import('./pages/manual/ManualIA'))
const ManualMelhorias_Manual = lazyWithRetry(() => import('./pages/manual/ManualMelhorias'))
const ManualCadastros = lazyWithRetry(() => import('./pages/manual/ManualCadastros'))
const ManualCustosRelatorios = lazyWithRetry(() => import('./pages/manual/ManualCustosRelatorios'))
const ManualSSMAPage = lazyWithRetry(() => import('./pages/manual/ManualSSMA'))
const ManualAdministracaoPage = lazyWithRetry(() => import('./pages/manual/ManualAdministracao'))
const ManualRotina = lazyWithRetry(() => import('./pages/manual/ManualRotina'))
const ManualKPIs = lazyWithRetry(() => import('./pages/manual/ManualKPIs'))
const ManualPrintAll = lazyWithRetry(() => import('./pages/manual/ManualPrintAll'))
import { logger } from "@/lib/logger";

initMonitoring();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      onError: (error) => {
        logger.error("mutation_failed", { error: String(error) });
      },
    },
  },
});

const AdminOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, tenantId } = useAuth();
  const { data: hasTenantAdminPermission, isLoading } = usePermission("tenant.admin", tenantId);

  if (isAdmin) {
    return <>{children}</>;
  }

  if (isLoading) return null;

  if (!hasTenantAdminPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const OwnerOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, isHydrating, authStatus, isSystemOwner, forcePasswordChange } = useAuth();
  const lastTraceRef = useRef<string>('');

  useEffect(() => {
    const isOwnerPath = location.pathname === '/' || location.pathname.startsWith('/owner');
    const traceKey = [
      location.pathname,
      isAuthenticated ? '1' : '0',
      isLoading ? '1' : '0',
      isHydrating ? '1' : '0',
      authStatus,
      isSystemOwner ? '1' : '0',
      forcePasswordChange ? '1' : '0',
    ].join('|');

    if (!isOwnerPath || lastTraceRef.current === traceKey) return;
    lastTraceRef.current = traceKey;

    logger.info('owner_route_guard_trace', {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      isAuthenticated,
      isLoading,
      isHydrating,
      authStatus,
      isSystemOwner,
      forcePasswordChange,
    });
  }, [authStatus, forcePasswordChange, isAuthenticated, isHydrating, isLoading, isSystemOwner, location.hash, location.pathname, location.search]);

  if (isLoading || isHydrating || authStatus === 'loading' || authStatus === 'hydrating') return <RouteLoading />;

  if (!isAuthenticated || !isSystemOwner) {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    const nextParam = encodeURIComponent(nextPath || '/');
    return <Navigate to={`/login?next=${nextParam}`} replace state={{ from: location }} />;
  }

  if (forcePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function OwnerRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route
          path="/login"
          element={
            <EnvironmentGuard allowOwner>
              <OwnerLogin />
            </EnvironmentGuard>
          }
        />

        <Route
          path="/change-password"
          element={
            <EnvironmentGuard allowOwner>
              <ChangePassword />
            </EnvironmentGuard>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <EnvironmentGuard allowOwner>
              <ForgotPassword />
            </EnvironmentGuard>
          }
        />

        <Route
          path="/reset-password"
          element={
            <EnvironmentGuard allowOwner>
              <ResetPassword />
            </EnvironmentGuard>
          }
        />

        <Route
          path="/"
          element={
            <EnvironmentGuard allowOwner>
              <OwnerOnlyRoute>
                <Owner />
              </OwnerOnlyRoute>
            </EnvironmentGuard>
          }
        />

        <Route path="/owner2" element={<Navigate to="/" replace />} />

        {/* Manual de Operação — 22 capítulos (owner) */}
        <Route path="/manuais-operacao/imprimir" element={<EnvironmentGuard allowOwner><ManualPrintAll /></EnvironmentGuard>} />
        <Route path="/manuais-operacao" element={<EnvironmentGuard allowOwner><ManualLayout basePath="/manuais-operacao" /></EnvironmentGuard>}>
          <Route index element={<ManualCover basePath="/manuais-operacao" />} />
          <Route path="login" element={<ManualLogin />} />
          <Route path="perfis" element={<ManualPerfis />} />
          <Route path="solicitacoes" element={<ManualSolicitacoes />} />
          <Route path="backlog" element={<ManualBacklog />} />
          <Route path="emitir-os" element={<ManualEmitirOS />} />
          <Route path="fechar-os" element={<ManualFecharOS />} />
          <Route path="historico" element={<ManualHistorico />} />
          <Route path="programacao" element={<ManualProgramacao />} />
          <Route path="preventiva" element={<ManualPreventiva />} />
          <Route path="preditiva" element={<ManualPreditiva />} />
          <Route path="lubrificacao" element={<ManualLubrificacao />} />
          <Route path="inspecoes" element={<ManualInspecoes />} />
          <Route path="fmea-rcm" element={<ManualFMEAPage />} />
          <Route path="rca" element={<ManualRCAPage />} />
          <Route path="inteligencia-ia" element={<ManualIA />} />
          <Route path="melhorias" element={<ManualMelhorias_Manual />} />
          <Route path="cadastros" element={<ManualCadastros />} />
          <Route path="custos-relatorios" element={<ManualCustosRelatorios />} />
          <Route path="ssma" element={<ManualSSMAPage />} />
          <Route path="administracao" element={<ManualAdministracaoPage />} />
          <Route path="rotina" element={<ManualRotina />} />
          <Route path="kpis" element={<ManualKPIs />} />
        </Route>

        <Route path="/manual/imprimir" element={<EnvironmentGuard allowOwner><ManualPrintAll /></EnvironmentGuard>} />
        <Route path="/manual" element={<EnvironmentGuard allowOwner><ManualLayout /></EnvironmentGuard>}>
          <Route index element={<ManualCover />} />
          <Route path="login" element={<ManualLogin />} />
          <Route path="perfis" element={<ManualPerfis />} />
          <Route path="solicitacoes" element={<ManualSolicitacoes />} />
          <Route path="backlog" element={<ManualBacklog />} />
          <Route path="emitir-os" element={<ManualEmitirOS />} />
          <Route path="fechar-os" element={<ManualFecharOS />} />
          <Route path="historico" element={<ManualHistorico />} />
          <Route path="programacao" element={<ManualProgramacao />} />
          <Route path="preventiva" element={<ManualPreventiva />} />
          <Route path="preditiva" element={<ManualPreditiva />} />
          <Route path="lubrificacao" element={<ManualLubrificacao />} />
          <Route path="inspecoes" element={<ManualInspecoes />} />
          <Route path="fmea-rcm" element={<ManualFMEAPage />} />
          <Route path="rca" element={<ManualRCAPage />} />
          <Route path="inteligencia-ia" element={<ManualIA />} />
          <Route path="melhorias" element={<ManualMelhorias_Manual />} />
          <Route path="cadastros" element={<ManualCadastros />} />
          <Route path="custos-relatorios" element={<ManualCustosRelatorios />} />
          <Route path="ssma" element={<ManualSSMAPage />} />
          <Route path="administracao" element={<ManualAdministracaoPage />} />
          <Route path="rotina" element={<ManualRotina />} />
          <Route path="kpis" element={<ManualKPIs />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function TenantRoutes() {
  return (
    <EnvironmentGuard>
      <TenantProvider>
        <TenantDomainMiddleware>
          <BrandingProvider>
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/instalar" element={<Instalar />} />

              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/solicitacoes" element={<Solicitacoes />} />
                <Route path="/os/nova" element={<NovaOS />} />
                <Route path="/os/fechar" element={<FecharOS />} />
                <Route path="/os/portal-mecanico" element={<PortalMecanicoOS />} />
                <Route path="/os/historico" element={<HistoricoOS />} />
                <Route path="/backlog" element={<Backlog />} />
                <Route path="/programacao" element={<Programacao />} />
                <Route path="/preventiva" element={<Preventiva />} />
                <Route path="/preditiva" element={<Preditiva />} />
                <Route path="/inspecoes" element={<Inspecoes />} />
                <Route path="/fmea" element={<FMEA />} />
                <Route path="/rca" element={<RCA />} />
                <Route path="/melhorias" element={<Melhorias />} />
                <Route path="/hierarquia" element={<Hierarquia />} />
                <Route path="/equipamentos" element={<Equipamentos />} />
                <Route path="/mecanicos" element={<Mecanicos />} />
                <Route path="/materiais" element={<Materiais />} />
                <Route path="/fornecedores" element={<Fornecedores />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/documentos" element={<DocumentosTecnicos />} />
                <Route path="/lubrificacao" element={<Lubrificacao />} />
                <Route path="/custos" element={<Custos />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/ssma" element={<SSMA />} />
                <Route path="/usuarios" element={<Navigate to="/administracao?tab=usuarios" replace />} />
                <Route path="/auditoria" element={<Auditoria />} />
                <Route path="/suporte" element={<Suporte />} />
                <Route
                  path="/administracao"
                  element={
                    <AdminOnlyRoute>
                      <Administracao />
                    </AdminOnlyRoute>
                  }
                />

                <Route
                  path="/empresa/configuracoes"
                  element={
                    <AdminOnlyRoute>
                      <ConfiguracoesEmpresa />
                    </AdminOnlyRoute>
                  }
                />

                <Route
                  path="/admin/arquivos-owner"
                  element={
                    <AdminOnlyRoute>
                      <ArquivosOwner />
                    </AdminOnlyRoute>
                  }
                />

                <Route
                  path="/master-ti"
                  element={
                    <MasterTIGuard>
                      <MasterTI />
                    </MasterTIGuard>
                  }
                />
                <Route path="/inteligencia-causa-raiz" element={<RootCauseAIPage />} />
                <Route path="/status" element={<SystemStatus />} />
              </Route>

                {/* Manual de Operação — 22 capítulos (tenant) */}
                <Route path="/manuais-operacao/imprimir" element={<ManualPrintAll />} />
                <Route path="/manuais-operacao" element={<ManualLayout basePath="/manuais-operacao" />}>
                  <Route index element={<ManualCover basePath="/manuais-operacao" />} />
                  <Route path="login" element={<ManualLogin />} />
                  <Route path="perfis" element={<ManualPerfis />} />
                  <Route path="solicitacoes" element={<ManualSolicitacoes />} />
                  <Route path="backlog" element={<ManualBacklog />} />
                  <Route path="emitir-os" element={<ManualEmitirOS />} />
                  <Route path="fechar-os" element={<ManualFecharOS />} />
                  <Route path="historico" element={<ManualHistorico />} />
                  <Route path="programacao" element={<ManualProgramacao />} />
                  <Route path="preventiva" element={<ManualPreventiva />} />
                  <Route path="preditiva" element={<ManualPreditiva />} />
                  <Route path="lubrificacao" element={<ManualLubrificacao />} />
                  <Route path="inspecoes" element={<ManualInspecoes />} />
                  <Route path="fmea-rcm" element={<ManualFMEAPage />} />
                  <Route path="rca" element={<ManualRCAPage />} />
                  <Route path="inteligencia-ia" element={<ManualIA />} />
                  <Route path="melhorias" element={<ManualMelhorias_Manual />} />
                  <Route path="cadastros" element={<ManualCadastros />} />
                  <Route path="custos-relatorios" element={<ManualCustosRelatorios />} />
                  <Route path="ssma" element={<ManualSSMAPage />} />
                  <Route path="administracao" element={<ManualAdministracaoPage />} />
                  <Route path="rotina" element={<ManualRotina />} />
                  <Route path="kpis" element={<ManualKPIs />} />
                </Route>

                <Route path="/manual/imprimir" element={<ManualPrintAll />} />
                <Route path="/manual" element={<ManualLayout />}>
                  <Route index element={<ManualCover />} />
                  <Route path="login" element={<ManualLogin />} />
                  <Route path="perfis" element={<ManualPerfis />} />
                  <Route path="solicitacoes" element={<ManualSolicitacoes />} />
                  <Route path="backlog" element={<ManualBacklog />} />
                  <Route path="emitir-os" element={<ManualEmitirOS />} />
                  <Route path="fechar-os" element={<ManualFecharOS />} />
                  <Route path="historico" element={<ManualHistorico />} />
                  <Route path="programacao" element={<ManualProgramacao />} />
                  <Route path="preventiva" element={<ManualPreventiva />} />
                  <Route path="preditiva" element={<ManualPreditiva />} />
                  <Route path="lubrificacao" element={<ManualLubrificacao />} />
                  <Route path="inspecoes" element={<ManualInspecoes />} />
                  <Route path="fmea-rcm" element={<ManualFMEAPage />} />
                  <Route path="rca" element={<ManualRCAPage />} />
                  <Route path="inteligencia-ia" element={<ManualIA />} />
                  <Route path="melhorias" element={<ManualMelhorias_Manual />} />
                  <Route path="cadastros" element={<ManualCadastros />} />
                  <Route path="custos-relatorios" element={<ManualCustosRelatorios />} />
                  <Route path="ssma" element={<ManualSSMAPage />} />
                  <Route path="administracao" element={<ManualAdministracaoPage />} />
                  <Route path="rotina" element={<ManualRotina />} />
                  <Route path="kpis" element={<ManualKPIs />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrandingProvider>
        </TenantDomainMiddleware>
      </TenantProvider>
    </EnvironmentGuard>
  );
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantQueryIsolationGuard />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {isOwnerDomain() ? <OwnerRoutes /> : <TenantRoutes />}
          </BrowserRouter>
          <TelemetryProvider />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;