import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import {
  BookOpen, LogIn, Users, FileText, ClipboardList, FilePlus, CheckSquare,
  History, Calendar, Shield, Activity, Droplets, Search, BarChart3,
  Brain, Lightbulb, Database, DollarSign, AlertTriangle, Settings,
  ListChecks, LineChart, Menu, X, ChevronLeft, ChevronRight, Printer,
} from "lucide-react";

const sections = [
  {
    group: "Introdução",
    items: [{ label: "Capa e Sumário", path: "/manual", icon: BookOpen }],
  },
  {
    group: "Acesso & Perfis",
    items: [
      { label: "Login e Primeiro Acesso", path: "/manual/login", icon: LogIn },
      { label: "Perfis e Permissões", path: "/manual/perfis", icon: Users },
    ],
  },
  {
    group: "Fluxo Operacional",
    items: [
      { label: "Solicitações", path: "/manual/solicitacoes", icon: FileText },
      { label: "Backlog", path: "/manual/backlog", icon: ClipboardList },
      { label: "Emitir O.S", path: "/manual/emitir-os", icon: FilePlus },
      { label: "Fechar O.S", path: "/manual/fechar-os", icon: CheckSquare },
      { label: "Histórico", path: "/manual/historico", icon: History },
    ],
  },
  {
    group: "Planejamento",
    items: [
      { label: "Programação", path: "/manual/programacao", icon: Calendar },
      { label: "Preventiva", path: "/manual/preventiva", icon: Shield },
      { label: "Preditiva", path: "/manual/preditiva", icon: Activity },
      { label: "Lubrificação", path: "/manual/lubrificacao", icon: Droplets },
      { label: "Inspeções", path: "/manual/inspecoes", icon: Search },
    ],
  },
  {
    group: "Análises Técnicas",
    items: [
      { label: "FMEA / RCM", path: "/manual/fmea-rcm", icon: BarChart3 },
      { label: "RCA", path: "/manual/rca", icon: Brain },
      { label: "Inteligência IA", path: "/manual/inteligencia-ia", icon: Lightbulb },
      { label: "Melhorias", path: "/manual/melhorias", icon: Lightbulb },
    ],
  },
  {
    group: "Cadastros & Dados",
    items: [
      { label: "Cadastros", path: "/manual/cadastros", icon: Database },
      { label: "Custos e Relatórios", path: "/manual/custos-relatorios", icon: DollarSign },
      { label: "SSMA", path: "/manual/ssma", icon: AlertTriangle },
    ],
  },
  {
    group: "Gestão & Controle",
    items: [
      { label: "Administração", path: "/manual/administracao", icon: Settings },
      { label: "Rotina Operacional", path: "/manual/rotina", icon: ListChecks },
    ],
  },
  {
    group: "Rotina & KPIs",
    items: [{ label: "KPIs e Métricas", path: "/manual/kpis", icon: LineChart }],
  },
];

const allPaths = sections.flatMap((s) => s.items.map((i) => i.path));

export default function ManualLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentIndex = allPaths.indexOf(location.pathname);
  const prevPath = currentIndex > 0 ? allPaths[currentIndex - 1] : null;
  const nextPath = currentIndex < allPaths.length - 1 ? allPaths[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-primary text-primary-foreground p-2 rounded-lg shadow-lg no-print"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-card border-r border-border overflow-y-auto flex-shrink-0 no-print transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
            <div className="p-4 border-b border-border">
              <Link to="/manual" className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-sm font-bold text-foreground">PCM Estratégico</h1>
                  <p className="text-[10px] text-muted-foreground">Manual de Operação v1.0</p>
                </div>
              </Link>
            </div>

            <nav className="p-3 space-y-4">
              {sections.map((section) => (
                <div key={section.group}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    {section.group}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-border space-y-2">
              <Link
                to="/manual/imprimir"
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Versão para Impressão / PDF
              </Link>
            </div>

            <div className="p-3 text-[10px] text-muted-foreground text-center border-t border-border">
              © {new Date().getFullYear()} PCM Estratégico
            </div>
          </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <Outlet />

          {/* Pagination */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-border no-print">
            {prevPath ? (
              <Link
                to={prevPath}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Link>
            ) : (
              <span />
            )}
            {nextPath ? (
              <Link
                to={nextPath}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
