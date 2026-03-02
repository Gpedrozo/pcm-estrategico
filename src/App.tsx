import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { AppLayout } from "@/components/layout/AppLayout";
import { EnvironmentGuard } from "@/components/guards/EnvironmentGuard";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { TenantProvider } from "@/contexts/TenantContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { isOwnerDomain } from "@/lib/security";

import Owner from "./pages/Owner";
import OwnerLogin from "@/owner/OwnerLogin";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NovaOS from "./pages/NovaOS";
import FecharOS from "./pages/FecharOS";
import HistoricoOS from "./pages/HistoricoOS";
import Equipamentos from "./pages/Equipamentos";
import Mecanicos from "./pages/Mecanicos";
import Usuarios from "./pages/Usuarios";
import Auditoria from "./pages/Auditoria";
import Hierarquia from "./pages/Hierarquia";
import Materiais from "./pages/Materiais";
import Solicitacoes from "./pages/Solicitacoes";
import Preventiva from "./pages/Preventiva";
import Inspecoes from "./pages/Inspecoes";
import FMEA from "./pages/FMEA";
import RCA from "./pages/RCA";
import SSMA from "./pages/SSMA";
import Melhorias from "./pages/Melhorias";
import Fornecedores from "./pages/Fornecedores";
import Contratos from "./pages/Contratos";
import Backlog from "./pages/Backlog";
import Programacao from "./pages/Programacao";
import Preditiva from "./pages/Preditiva";
import Custos from "./pages/Custos";
import Relatorios from "./pages/Relatorios";
import DocumentosTecnicos from "./pages/DocumentosTecnicos";
import Lubrificacao from "./pages/Lubrificacao";
import NotFound from "./pages/NotFound";
import Instalar from "./pages/Instalar";
import MasterTI from "./pages/MasterTI";
import ArquivosOwner from "./pages/ArquivosOwner";
import RootCauseAIPage from "./modules/rootCauseAI/RootCauseAIPage";
import { logger } from "@/lib/logger";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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

function OwnerRoutes() {
  return (
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
            <Owner />
          </EnvironmentGuard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function TenantRoutes() {
  return (
    <EnvironmentGuard>
      <TenantProvider>
        <BrandingProvider>
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
                path="/admin/arquivos-owner"
                element={
                  <AdminOnlyRoute>
                    <ArquivosOwner />
                  </AdminOnlyRoute>
                }
              />

              <Route path="/master-ti" element={<MasterTI />} />
              <Route path="/inteligencia-causa-raiz" element={<RootCauseAIPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrandingProvider>
      </TenantProvider>
    </EnvironmentGuard>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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