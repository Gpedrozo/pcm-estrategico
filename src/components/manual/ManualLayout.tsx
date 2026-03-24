import { useState, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen, LogIn, Users, FileText, ClipboardList, FilePlus, CheckSquare,
  History, Calendar, Shield, Activity, Droplets, Search, BarChart3,
  Brain, Lightbulb, Database, DollarSign, AlertTriangle, Settings,
  ListChecks, LineChart, Menu, X, ChevronLeft, ChevronRight, Printer,
} from "lucide-react";

const chapters = [
  { num: "01", label: "Login e Primeiro Acesso", slug: "login", icon: LogIn },
  { num: "02", label: "Perfis e Permissões", slug: "perfis", icon: Users },
  { num: "03", label: "Solicitações", slug: "solicitacoes", icon: FileText },
  { num: "04", label: "Backlog", slug: "backlog", icon: ClipboardList },
  { num: "05", label: "Emitir O.S", slug: "emitir-os", icon: FilePlus },
  { num: "06", label: "Fechar O.S", slug: "fechar-os", icon: CheckSquare },
  { num: "07", label: "Histórico", slug: "historico", icon: History },
  { num: "08", label: "Programação", slug: "programacao", icon: Calendar },
  { num: "09", label: "Preventiva", slug: "preventiva", icon: Shield },
  { num: "10", label: "Preditiva", slug: "preditiva", icon: Activity },
  { num: "11", label: "Lubrificação", slug: "lubrificacao", icon: Droplets },
  { num: "12", label: "Inspeções", slug: "inspecoes", icon: Search },
  { num: "13", label: "FMEA / RCM", slug: "fmea-rcm", icon: BarChart3 },
  { num: "14", label: "RCA", slug: "rca", icon: Brain },
  { num: "15", label: "Inteligência IA", slug: "inteligencia-ia", icon: Lightbulb },
  { num: "16", label: "Melhorias", slug: "melhorias", icon: Lightbulb },
  { num: "17", label: "Cadastros", slug: "cadastros", icon: Database },
  { num: "18", label: "Custos e Relatórios", slug: "custos-relatorios", icon: DollarSign },
  { num: "19", label: "SSMA", slug: "ssma", icon: AlertTriangle },
  { num: "20", label: "Administração", slug: "administracao", icon: Settings },
  { num: "21", label: "Rotina Operacional", slug: "rotina", icon: ListChecks },
  { num: "22", label: "KPIs e Métricas", slug: "kpis", icon: LineChart },
];

interface ManualLayoutProps {
  basePath?: string;
}

export default function ManualLayout({ basePath = "/manual" }: ManualLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allPaths = useMemo(() => [basePath, ...chapters.map((c) => `${basePath}/${c.slug}`)], [basePath]);

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
              <Link to={basePath} className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-sm font-bold text-foreground">PCM Estratégico</h1>
                  <p className="text-[10px] text-muted-foreground">Manual de Operação v1.0</p>
                </div>
              </Link>
            </div>

            <nav className="p-3 space-y-0.5">
              <Link
                to={basePath}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  location.pathname === basePath
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Sumário
              </Link>
              {chapters.map((ch) => {
                const Icon = ch.icon;
                const path = `${basePath}/${ch.slug}`;
                const active = location.pathname === path;
                return (
                  <Link
                    key={ch.slug}
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="w-5 text-[10px] font-mono opacity-60">{ch.num}</span>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{ch.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border space-y-2">
              <Link
                to={`${basePath}/imprimir`}
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
