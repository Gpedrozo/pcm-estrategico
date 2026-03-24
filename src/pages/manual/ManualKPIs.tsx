import { ManualSection, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";

const kpis = [
  {
    nome: "MTBF",
    titulo: "Mean Time Between Failures",
    formula: "MTBF = Tempo Total de Operação / Nº de Falhas",
    meta: "> 720h (30 dias)",
    interpretacao: "Quanto maior, melhor a confiabilidade do ativo.",
    cor: "bg-primary",
  },
  {
    nome: "MTTR",
    titulo: "Mean Time To Repair",
    formula: "MTTR = Tempo Total de Reparo / Nº de Intervenções",
    meta: "< 4h",
    interpretacao: "Quanto menor, mais eficiente é a equipe de manutenção.",
    cor: "bg-info",
  },
  {
    nome: "Disponibilidade",
    titulo: "Availability",
    formula: "Disponibilidade = MTBF / (MTBF + MTTR) × 100",
    meta: "> 95%",
    interpretacao: "Percentual do tempo em que o ativo está disponível para operação.",
    cor: "bg-green-600",
  },
  {
    nome: "Aderência Preventiva",
    titulo: "Preventive Compliance",
    formula: "Aderência = Preventivas Executadas / Preventivas Programadas × 100",
    meta: "> 90%",
    interpretacao: "Mede a disciplina na execução do plano preventivo.",
    cor: "bg-green-600",
  },
  {
    nome: "Backlog Vencido",
    titulo: "Overdue Backlog",
    formula: "Backlog Vencido = Ordens Vencidas / Total do Backlog × 100",
    meta: "< 10%",
    interpretacao: "Quanto menor, melhor o controle sobre demandas pendentes.",
    cor: "bg-warning",
  },
  {
    nome: "Tempo Médio de Atendimento",
    titulo: "Average Response Time",
    formula: "TMA = Soma dos Lead Times / Nº de O.S Fechadas",
    meta: "< 24h para prioridade Alta",
    interpretacao: "Velocidade de resposta às demandas de manutenção.",
    cor: "bg-info",
  },
  {
    nome: "Custo por Ativo",
    titulo: "Cost per Asset",
    formula: "CPA = Custo Total de Manutenção / Nº de Ativos Atendidos",
    meta: "Redução contínua",
    interpretacao: "Identifica ativos com custo desproporcional.",
    cor: "bg-primary",
  },
  {
    nome: "Taxa de Reincidência",
    titulo: "Recurrence Rate",
    formula: "Reincidência = Falhas Reincidentes / Total de Falhas × 100",
    meta: "< 5%",
    interpretacao: "Alta reincidência indica falha na causa raiz.",
    cor: "bg-destructive",
  },
];

export default function ManualKPIs() {
  return (
    <ManualSection id="kpis" number="22" title="KPIs e Métricas de Manutenção">
      <ObjectiveBox>
        Acompanhar indicadores-chave para medir eficiência, confiabilidade e custo da operação de manutenção.
      </ObjectiveBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.nome} className="manual-card space-y-2 print-avoid-break">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${kpi.cor}`} />
              <h3 className="text-sm font-bold text-foreground">{kpi.nome}</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">{kpi.titulo}</p>
            <div className="rounded bg-muted/50 px-3 py-1.5">
              <code className="text-xs text-foreground">{kpi.formula}</code>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Meta: <strong className="text-foreground">{kpi.meta}</strong></span>
            </div>
            <p className="text-xs text-muted-foreground">{kpi.interpretacao}</p>
          </div>
        ))}
      </div>

      <HighlightBox variant="tip" title="Revisão Mensal">
        Todos os KPIs devem ser revisados mensalmente em reunião de gestão. Desvios acima de 10% em relação à meta exigem plano de ação documentado.
      </HighlightBox>
    </ManualSection>
  );
}
