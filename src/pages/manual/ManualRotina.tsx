import { ManualSection, HighlightBox } from "@/components/manual/ManualSection";

export default function ManualRotina() {
  return (
    <ManualSection id="rotina" number="21" title="Rotina Operacional Recomendada">
      {/* Diário */}
      <div className="manual-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-manual-success" />
          <h3 className="text-base font-semibold text-foreground">Diário</h3>
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {[
            "Login e checagem do Dashboard.",
            "Triagem de novas solicitações.",
            "Priorização do backlog do turno.",
            "Emissão e acompanhamento de O.S do dia.",
            "Fechamento de pendências críticas antes do fim do turno.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="manual-step-number w-6 h-6 text-xs flex-shrink-0">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      {/* Semanal */}
      <div className="manual-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-manual-info" />
          <h3 className="text-base font-semibold text-foreground">Semanal</h3>
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {[
            "Revisar programação da semana seguinte.",
            "Validar aderência preventiva e alertas preditivos.",
            "Analisar histórico de O.S da semana.",
            "Revisar status de melhorias e SSMA.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="manual-step-number w-6 h-6 text-xs flex-shrink-0">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      {/* Mensal */}
      <div className="manual-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-manual-warning" />
          <h3 className="text-base font-semibold text-foreground">Mensal</h3>
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {[
            "Consolidar custos e relatórios gerenciais.",
            "Revisar indicadores de confiabilidade (MTBF, MTTR).",
            "Auditoria de acessos e trilhas.",
            "Plano de ação para o próximo ciclo.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="manual-step-number w-6 h-6 text-xs flex-shrink-0">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <HighlightBox variant="tip" title="Disciplina Operacional">
        A rotina é o que separa manutenção reativa de manutenção estratégica. Siga o ciclo diário/semanal/mensal para garantir consistência e melhoria contínua.
      </HighlightBox>
    </ManualSection>
  );
}
