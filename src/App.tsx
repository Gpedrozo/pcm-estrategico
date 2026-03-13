import { Suspense, lazy } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { AppLayout } from "@/components/layout/AppLayout";
import { EnvironmentGuard } from "@/components/guards/EnvironmentGuard";
import { TenantQueryIsolationGuard } from '@/components/guards/TenantQueryIsolationGuard';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { TenantProvider } from "@/contexts/TenantContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { isOwnerDomain } from "@/lib/security";
import { Loader2 } from 'lucide-react'

const Owner = lazy(() => import('./pages/Owner'))
const OwnerLogin = lazy(() => import('@/owner/OwnerLogin'))

const Index = lazy(() => import('./pages/Index'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NovaOS = lazy(() => import('./pages/NovaOS'))
const FecharOS = lazy(() => import('./pages/FecharOS'))
const HistoricoOS = lazy(() => import('./pages/HistoricoOS'))
const Equipamentos = lazy(() => import('./pages/Equipamentos'))
const Mecanicos = lazy(() => import('./pages/Mecanicos'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const Hierarquia = lazy(() => import('./pages/Hierarquia'))
const Materiais = lazy(() => import('./pages/Materiais'))
const Solicitacoes = lazy(() => import('./pages/Solicitacoes'))
const Preventiva = lazy(() => import('./pages/Preventiva'))
const Inspecoes = lazy(() => import('./pages/Inspecoes'))
const FMEA = lazy(() => import('./pages/FMEA'))
const RCA = lazy(() => import('./pages/RCA'))
const SSMA = lazy(() => import('./pages/SSMA'))
const Melhorias = lazy(() => import('./pages/Melhorias'))
const Fornecedores = lazy(() => import('./pages/Fornecedores'))
const Contratos = lazy(() => import('./pages/Contratos'))
const Backlog = lazy(() => import('./pages/Backlog'))
const Programacao = lazy(() => import('./pages/Programacao'))
const Preditiva = lazy(() => import('./pages/Preditiva'))
const Custos = lazy(() => import('./pages/Custos'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const DocumentosTecnicos = lazy(() => import('./pages/DocumentosTecnicos'))
const ConfiguracoesEmpresa = lazy(() => import('./pages/ConfiguracoesEmpresa'))
const Lubrificacao = lazy(() => import('./pages/Lubrificacao'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Instalar = lazy(() => import('./pages/Instalar'))
const ArquivosOwner = lazy(() => import('./pages/ArquivosOwner'))
const RootCauseAIPage = lazy(() => import('./modules/rootCauseAI/RootCauseAIPage'))
const ManualOperacao = lazy(() => import('./pages/ManualOperacao'))
import { logger } from "@/lib/logger";

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

  if (isLoading) return null;

  if (!isAdmin || !hasTenantAdminPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const OwnerOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isSystemOwner } = useAuth();

  if (isLoading) return <RouteLoading />;

  if (!isAuthenticated || !isSystemOwner) {
    return <Navigate to="/login" replace />;
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
          path="/"
          element={
            <EnvironmentGuard allowOwner>
              <OwnerOnlyRoute>
                <Owner />
              </OwnerOnlyRoute>
            </EnvironmentGuard>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function TenantRoutes() {
  return (
    <EnvironmentGuard>
      <TenantProvider>
        <BrandingProvider>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/instalar" element={<Instalar />} />

              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/solicitacoes" element={<Solicitacoes />} />
                <Route path="/os/nova" element={<NovaOS />} />
                <Route path="/os/fechar" element={<FecharOS />} />
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
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/auditoria" element={<Auditoria />} />
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

                <Route path="/master-ti" element={<Navigate to="/dashboard" replace />} />
                <Route path="/inteligencia-causa-raiz" element={<RootCauseAIPage />} />
                <Route path="/manuais-operacao" element={<ManualOperacao />} />
                <Route path="/manuais-operacao/usuario" element={<ManualOperacao />} />
                <Route path="/manuais-operacao/admin" element={<ManualOperacao />} />
                <Route path="/manuais-operacao/master-ti" element={<ManualOperacao />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrandingProvider>
      </TenantProvider>
    </EnvironmentGuard>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantQueryIsolationGuard />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {isOwnerDomain() ? <OwnerRoutes /> : <TenantRoutes />}
        </BrowserRouter>
        <SpeedInsights />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;