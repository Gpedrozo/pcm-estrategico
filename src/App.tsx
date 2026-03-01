import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Pages
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
import RootCauseAIPage from "./modules/rootCauseAI/RootCauseAIPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TenantProvider>
        <BrandingProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/instalar" element={<Instalar />} />
            
            {/* Protected Routes with Layout */}
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
              <Route path="/master-ti" element={<MasterTI />} />
              <Route path="/inteligencia-causa-raiz" element={<RootCauseAIPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
              <SpeedInsights />
            </TooltipProvider>
          </AuthProvider>
        </BrandingProvider>
      </TenantProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
