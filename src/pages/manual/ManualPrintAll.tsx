import { BookOpen, Printer } from "lucide-react";
import { Link } from "react-router-dom";

// Import all chapter components
import ManualLogin from "./ManualLogin";
import ManualPerfis from "./ManualPerfis";
import ManualSolicitacoes from "./ManualSolicitacoes";
import ManualBacklog from "./ManualBacklog";
import ManualEmitirOS from "./ManualEmitirOS";
import ManualFecharOS from "./ManualFecharOS";
import ManualHistorico from "./ManualHistorico";
import ManualProgramacao from "./ManualProgramacao";
import ManualPreventiva from "./ManualPreventiva";
import ManualPreditiva from "./ManualPreditiva";
import ManualLubrificacao from "./ManualLubrificacao";
import ManualInspecoes from "./ManualInspecoes";
import ManualFMEA from "./ManualFMEA";
import ManualRCA from "./ManualRCA";
import ManualIA from "./ManualIA";
import ManualMelhorias from "./ManualMelhorias";
import ManualCadastros from "./ManualCadastros";
import ManualCustosRelatorios from "./ManualCustosRelatorios";
import ManualSSMA from "./ManualSSMA";
import ManualAdministracao from "./ManualAdministracao";
import ManualRotina from "./ManualRotina";
import ManualKPIs from "./ManualKPIs";

const chapters = [
  { num: "01", title: "Login e Primeiro Acesso", Component: ManualLogin },
  { num: "02", title: "Perfis e Permissões", Component: ManualPerfis },
  { num: "03", title: "Solicitações de Manutenção", Component: ManualSolicitacoes },
  { num: "04", title: "Backlog de Manutenção", Component: ManualBacklog },
  { num: "05", title: "Emitir Ordem de Serviço", Component: ManualEmitirOS },
  { num: "06", title: "Fechar Ordem de Serviço", Component: ManualFecharOS },
  { num: "07", title: "Histórico de O.S", Component: ManualHistorico },
  { num: "08", title: "Programação de Manutenção", Component: ManualProgramacao },
  { num: "09", title: "Manutenção Preventiva", Component: ManualPreventiva },
  { num: "10", title: "Manutenção Preditiva", Component: ManualPreditiva },
  { num: "11", title: "Lubrificação", Component: ManualLubrificacao },
  { num: "12", title: "Inspeções", Component: ManualInspecoes },
  { num: "13", title: "FMEA / RCM", Component: ManualFMEA },
  { num: "14", title: "RCA — Análise de Causa Raiz", Component: ManualRCA },
  { num: "15", title: "Inteligência Artificial", Component: ManualIA },
  { num: "16", title: "Melhorias", Component: ManualMelhorias },
  { num: "17", title: "Cadastros Estruturais", Component: ManualCadastros },
  { num: "18", title: "Custos e Relatórios", Component: ManualCustosRelatorios },
  { num: "19", title: "SSMA", Component: ManualSSMA },
  { num: "20", title: "Administração e Governança", Component: ManualAdministracao },
  { num: "21", title: "Rotina Operacional", Component: ManualRotina },
  { num: "22", title: "KPIs e Métricas", Component: ManualKPIs },
];

export default function ManualPrintAll() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header bar — no-print */}
      <div className="no-print sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/manual" className="text-sm text-primary hover:underline flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            Voltar ao Manual
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-foreground font-medium">Versão para Impressão / PDF</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Print content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Cover page */}
        <div className="print-cover-page text-center py-16 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Manual de Operação</h1>
          <p className="text-xl text-muted-foreground">PCM Estratégico — Sistema de Gestão de Manutenção</p>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            Versão 1.0
          </span>
          <div className="pt-8 text-sm text-muted-foreground">
            <p>Documento gerado em {new Date().toLocaleDateString("pt-BR")}</p>
          </div>

          {/* TOC for print */}
          <div className="pt-12 text-left max-w-md mx-auto">
            <h2 className="text-lg font-bold text-foreground mb-4">Sumário</h2>
            <ol className="space-y-1">
              {chapters.map((ch) => (
                <li key={ch.num} className="flex items-baseline gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-foreground font-semibold w-6">{ch.num}</span>
                  <span className="flex-1 border-b border-dotted border-border">{ch.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* All chapters */}
        {chapters.map((ch) => (
          <div key={ch.num} className="print-page-break">
            <ch.Component />
          </div>
        ))}

        {/* Footer */}
        <div className="print-page-break text-center py-16 text-muted-foreground">
          <p className="text-sm">— Fim do Manual —</p>
          <p className="text-xs mt-2">© {new Date().getFullYear()} PCM Estratégico. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
