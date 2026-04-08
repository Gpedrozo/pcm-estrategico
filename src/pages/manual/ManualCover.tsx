import { Link } from "react-router-dom";
import {
  BookOpen, LogIn, Users, FileText, ClipboardList, FilePlus, CheckSquare,
  History, Calendar, Shield, Activity, Droplets, Search, BarChart3,
  Brain, Lightbulb, Database, DollarSign, AlertTriangle, Settings,
  ListChecks, LineChart, UserCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getChaptersForRole, roleLabelMap, manualChapters } from "@/lib/manualRoleConfig";

const iconMap: Record<string, any> = {
  login: LogIn,
  perfis: Users,
  solicitacoes: FileText,
  backlog: ClipboardList,
  "emitir-os": FilePlus,
  "fechar-os": CheckSquare,
  historico: History,
  programacao: Calendar,
  preventiva: Shield,
  preditiva: Activity,
  lubrificacao: Droplets,
  inspecoes: Search,
  "fmea-rcm": BarChart3,
  rca: Brain,
  "inteligencia-ia": Lightbulb,
  melhorias: Lightbulb,
  cadastros: Database,
  "custos-relatorios": DollarSign,
  ssma: AlertTriangle,
  administracao: Settings,
  rotina: ListChecks,
  kpis: LineChart,
};

export default function ManualCover({ basePath = "/manual" }: { basePath?: string }) {
  const { effectiveRole } = useAuth();
  const visibleChapters = getChaptersForRole(effectiveRole);
  const roleLabel = effectiveRole ? roleLabelMap[effectiveRole] || effectiveRole : 'Usuário';
  const totalChapters = manualChapters.length;
  const isFiltered = visibleChapters.length < totalChapters;

  return (
    <div className="space-y-10">
      {/* Cover */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Manual de Operação
        </h1>
        <p className="text-lg text-muted-foreground">PCM Estratégico — Sistema de Gestão de Manutenção</p>
        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          v2.0
        </span>

        <div className="print-only text-sm text-muted-foreground mt-4">
          <p>Documento gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      {/* Role badge */}
      {isFiltered && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <UserCircle className="w-5 h-5 text-primary" />
          <div className="text-sm">
            <span className="text-muted-foreground">Seu perfil: </span>
            <span className="font-semibold text-foreground">{roleLabel}</span>
            <span className="text-muted-foreground"> — exibindo {visibleChapters.length} de {totalChapters} capítulos</span>
          </div>
        </div>
      )}

      {/* TOC */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Sumário</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleChapters.map((ch) => {
            const Icon = iconMap[ch.slug] || BookOpen;
            return (
              <div key={ch.num}>
                <Link
                  to={`${basePath}/${ch.slug}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                >
                  <span className="manual-step-number w-8 h-8 text-xs flex-shrink-0">
                    {ch.num}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {ch.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ch.desc}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
