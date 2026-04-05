import { forwardRef } from 'react';

interface PrintableReportProps {
  tag: string;
  equipamentoNome?: string;
  summary: string;
  possibleCauses: string[];
  mainHypothesis: string;
  preventiveActions: string[];
  criticality: string;
  confidenceScore: number;
  osCount: number | null;
  mtbfDays: number | null;
  generatedAt: string;
  dateFrom?: string;
  dateTo?: string;
}

const critColorMap: Record<string, { bg: string; border: string; text: string }> = {
  Baixo:   { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
  Médio:   { bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' },
  Alto:    { bg: '#ffedd5', border: '#ea580c', text: '#9a3412' },
  Crítico: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' },
};

export const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(
  (
    {
      tag,
      equipamentoNome,
      summary,
      possibleCauses,
      mainHypothesis,
      preventiveActions,
      criticality,
      confidenceScore,
      osCount,
      mtbfDays,
      generatedAt,
      dateFrom,
      dateTo,
    },
    ref,
  ) => {
    const crit = critColorMap[criticality] || critColorMap['Médio'];

    const periodLabel =
      dateFrom || dateTo
        ? `${dateFrom || 'início'} até ${dateTo || 'hoje'}`
        : 'Todo o histórico disponível';

    return (
      <div ref={ref} className="print-report">
        {/* ── Header ─────────────────────────── */}
        <div className="report-header">
          <div className="report-header-left">
            <h1>Relatório de Análise de Causa Raiz</h1>
            <p className="report-subtitle">PCM Estratégico — Inteligência Artificial</p>
          </div>
          <div className="report-header-right">
            <table className="report-meta-table">
              <tbody>
                <tr><td className="meta-label">TAG</td><td className="meta-value mono">{tag}</td></tr>
                {equipamentoNome && <tr><td className="meta-label">Equipamento</td><td className="meta-value">{equipamentoNome}</td></tr>}
                <tr><td className="meta-label">Período</td><td className="meta-value">{periodLabel}</td></tr>
                <tr><td className="meta-label">Gerado em</td><td className="meta-value">{new Date(generatedAt).toLocaleString('pt-BR')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="report-divider" />

        {/* ── Metrics ────────────────────────── */}
        <div className="report-metrics">
          {osCount != null && (
            <div className="metric-box">
              <span className="metric-value">{osCount}</span>
              <span className="metric-label">O.S. Analisadas</span>
            </div>
          )}
          {mtbfDays != null && (
            <div className="metric-box">
              <span className="metric-value">{mtbfDays.toFixed(0)} dias</span>
              <span className="metric-label">MTBF Estimado</span>
            </div>
          )}
          <div className="metric-box" style={{ borderColor: crit.border }}>
            <span className="metric-value" style={{ color: crit.text }}>{criticality}</span>
            <span className="metric-label">Criticidade</span>
          </div>
          <div className="metric-box">
            <span className="metric-value">{confidenceScore}%</span>
            <span className="metric-label">Score de Confiança</span>
            <div className="confidence-bar-container">
              <div
                className="confidence-bar-fill"
                style={{
                  width: `${confidenceScore}%`,
                  backgroundColor:
                    confidenceScore >= 70 ? '#16a34a' : confidenceScore >= 40 ? '#ca8a04' : '#dc2626',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Summary ────────────────────────── */}
        <div className="report-section">
          <h2>1. Resumo Executivo</h2>
          <p className="report-text">{summary}</p>
        </div>

        {/* ── Main Hypothesis ────────────────── */}
        <div className="report-section report-highlight" style={{ borderLeftColor: crit.border }}>
          <h2>2. Causa Raiz Principal</h2>
          <p className="report-text highlight-text">{mainHypothesis}</p>
        </div>

        {/* ── Possible Causes ────────────────── */}
        <div className="report-section">
          <h2>3. Possíveis Causas</h2>
          {possibleCauses.length > 0 ? (
            <ol className="report-list numbered">
              {possibleCauses.map((cause, i) => (
                <li key={i}>{cause}</li>
              ))}
            </ol>
          ) : (
            <p className="report-text muted">Nenhuma causa adicional identificada.</p>
          )}
        </div>

        {/* ── Preventive Actions ─────────────── */}
        <div className="report-section">
          <h2>4. Ações Preventivas Recomendadas</h2>
          {preventiveActions.length > 0 ? (
            <ul className="report-checklist">
              {preventiveActions.map((action, i) => (
                <li key={i}>
                  <span className="checkbox" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="report-text muted">Nenhuma ação preventiva sugerida.</p>
          )}
        </div>

        {/* ── Footer ─────────────────────────── */}
        <div className="report-footer">
          <div className="report-divider" />
          <p>
            Relatório gerado automaticamente por Inteligência Artificial — PCM Estratégico
          </p>
          <p className="footer-date">
            Impresso em: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    );
  },
);

PrintableReport.displayName = 'PrintableReport';
