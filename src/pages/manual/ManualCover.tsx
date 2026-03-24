import { Link } from "react-router-dom";
import {
  BookOpen, LogIn, Users, FileText, ClipboardList, FilePlus, CheckSquare,
  History, Calendar, Shield, Activity, Droplets, Search, BarChart3,
  Brain, Lightbulb, Database, DollarSign, AlertTriangle, Settings,
  ListChecks, LineChart,
} from "lucide-react";

const chapters = [
  { num: "01", title: "Login e Primeiro Acesso", path: "/manual/login", icon: LogIn, desc: "Autenticação, recuperação de senha e primeiro login" },
  { num: "02", title: "Perfis e Permissões", path: "/manual/perfis", icon: Users, desc: "Níveis de acesso: Solicitante, Usuário, Admin, Master TI" },
  { num: "03", title: "Solicitações de Manutenção", path: "/manual/solicitacoes", icon: FileText, desc: "Abertura, triagem e acompanhamento de solicitações" },
  { num: "04", title: "Backlog de Manutenção", path: "/manual/backlog", icon: ClipboardList, desc: "Gestão de demandas pendentes e priorização" },
  { num: "05", title: "Emitir Ordem de Serviço", path: "/manual/emitir-os", icon: FilePlus, desc: "Criação e detalhamento de O.S" },
  { num: "06", title: "Fechar Ordem de Serviço", path: "/manual/fechar-os", icon: CheckSquare, desc: "Encerramento, materiais e validação técnica" },
  { num: "07", title: "Histórico de O.S", path: "/manual/historico", icon: History, desc: "Consulta avançada e análise de histórico" },
  { num: "08", title: "Programação de Manutenção", path: "/manual/programacao", icon: Calendar, desc: "Calendário, alocação e capacidade" },
  { num: "09", title: "Manutenção Preventiva", path: "/manual/preventiva", icon: Shield, desc: "Planos, periodicidade e aderência" },
  { num: "10", title: "Manutenção Preditiva", path: "/manual/preditiva", icon: Activity, desc: "Medições, tendências e alertas preditivos" },
  { num: "11", title: "Lubrificação", path: "/manual/lubrificacao", icon: Droplets, desc: "Planos de lubrificação e controle" },
  { num: "12", title: "Inspeções", path: "/manual/inspecoes", icon: Search, desc: "Rotinas de inspeção e anomalias" },
  { num: "13", title: "FMEA / RCM", path: "/manual/fmea-rcm", icon: BarChart3, desc: "Análise de modos de falha e confiabilidade" },
  { num: "14", title: "RCA — Análise de Causa Raiz", path: "/manual/rca", icon: Brain, desc: "Investigação de causa raiz e ações corretivas" },
  { num: "15", title: "Inteligência Artificial", path: "/manual/inteligencia-ia", icon: Lightbulb, desc: "Diagnóstico assistido por IA" },
  { num: "16", title: "Melhorias", path: "/manual/melhorias", icon: Lightbulb, desc: "Gestão de melhorias de confiabilidade" },
  { num: "17", title: "Cadastros Estruturais", path: "/manual/cadastros", icon: Database, desc: "Hierarquia, equipamentos, materiais, fornecedores" },
  { num: "18", title: "Custos e Relatórios", path: "/manual/custos-relatorios", icon: DollarSign, desc: "Visão financeira e relatórios gerenciais" },
  { num: "19", title: "SSMA", path: "/manual/ssma", icon: AlertTriangle, desc: "Segurança, saúde e meio ambiente" },
  { num: "20", title: "Administração e Governança", path: "/manual/administracao", icon: Settings, desc: "Usuários, auditoria e configuração" },
  { num: "21", title: "Rotina Operacional", path: "/manual/rotina", icon: ListChecks, desc: "Ciclo diário, semanal e mensal" },
  { num: "22", title: "KPIs e Métricas", path: "/manual/kpis", icon: LineChart, desc: "MTBF, MTTR, disponibilidade e mais" },
];

export default function ManualCover() {
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
          v1.0
        </span>

        <div className="print-only text-sm text-muted-foreground mt-4">
          <p>Documento gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      {/* TOC */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Sumário</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chapters.map((ch, i) => {
            const Icon = ch.icon;
            return (
              <div key={ch.num}>
                <Link
                  to={ch.path}
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
