import { ManualSection, StepList, Checklist, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar } from "@/components/manual/ScreenMockup";

export default function ManualBacklog() {
  return (
    <ManualSection id="backlog" number="04" title="Backlog de Manutenção">
      <ObjectiveBox>
        Gerenciar e priorizar todas as demandas pendentes de manutenção em um painel unificado.
      </ObjectiveBox>

      <ScreenMockup title="Backlog — Painel de Priorização">
        <div className="flex">
          <MockSidebar activeItem="Backlog" items={["Dashboard", "Solicitações", "Backlog", "O.S"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Backlog de Manutenção</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                <p className="text-2xl font-bold text-destructive">12</p>
                <p className="text-[10px] text-muted-foreground">Críticas</p>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-center">
                <p className="text-2xl font-bold text-warning">28</p>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-2xl font-bold text-primary">45</p>
                <p className="text-[10px] text-muted-foreground">Programadas</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { id: "BKL-085", tag: "BOM-001", desc: "Falha no rolamento — reincidência", pri: "Crítica", dias: "3 dias" },
                { id: "BKL-082", tag: "CMP-003", desc: "Ruído anormal no cilindro", pri: "Alta", dias: "5 dias" },
                { id: "BKL-078", tag: "MTR-012", desc: "Vibração acima do normal", pri: "Média", dias: "8 dias" },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                  <span className="text-[10px] font-mono text-muted-foreground w-14">{item.id}</span>
                  <span className="text-[10px] font-mono text-primary w-16">{item.tag}</span>
                  <span className="text-xs text-foreground flex-1">{item.desc}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    item.pri === "Crítica"
                      ? "bg-destructive/15 text-destructive"
                      : item.pri === "Alta"
                      ? "bg-warning/15 text-warning"
                      : "bg-primary/15 text-primary"
                  }`}>{item.pri}</span>
                  <span className="text-[10px] text-muted-foreground w-12 text-right">{item.dias}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acessar o módulo Backlog no menu lateral.",
          "Revisar as demandas por nível de prioridade.",
          "Atualizar prioridade conforme contexto operacional.",
          "Converter itens prioritários em Ordem de Serviço.",
          "Monitorar aging (tempo de espera) das pendências.",
        ]}
      />

      <Checklist
        items={[
          "Nenhuma demanda crítica com mais de 48h sem ação.",
          "Backlog revisado ao menos 1x por turno.",
          "Itens com aging > 30 dias escalados para gestão.",
        ]}
      />
    </ManualSection>
  );
}
