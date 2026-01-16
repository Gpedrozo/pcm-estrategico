import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes with Layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/os/nova" element={<NovaOS />} />
              <Route path="/os/fechar" element={<FecharOS />} />
              <Route path="/os/historico" element={<HistoricoOS />} />
              <Route path="/equipamentos" element={<Equipamentos />} />
              <Route path="/mecanicos" element={<Mecanicos />} />
              <Route path="/hierarquia" element={<Hierarquia />} />
              <Route path="/materiais" element={<Materiais />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/auditoria" element={<Auditoria />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
