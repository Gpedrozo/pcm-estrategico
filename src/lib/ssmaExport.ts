import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { IncidenteSSMARow } from '@/hooks/useSSMA';
import type { TreinamentoSSMARow } from '@/hooks/useTreinamentosSSMA';
import type { EPIRow, EntregaEPIRow } from '@/hooks/useEPIs';
import type { FichaSegurancaRow } from '@/hooks/useFichasSeguranca';
import type { DadosEmpresa } from '@/hooks/useDadosEmpresa';

function addPDFHeader(doc: jsPDF, title: string, empresa?: DadosEmpresa | null) {
  const displayName = empresa?.nome_fantasia || empresa?.razao_social || 'SISTEMA PCM';
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(displayName, 14, 10);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(title, 14, 18);
  doc.setFontSize(8);
  doc.setTextColor(100);
  const hoje = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.text(`Gerado em ${hoje}`, 14, 24);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, 26, 196, 26);
}

// ── Relatório de Incidentes ─────────────────────────────────────────────────
export function exportIncidentesPDF(incidentes: IncidenteSSMARow[], empresa?: DadosEmpresa | null) {
  const doc = new jsPDF({ orientation: 'landscape' });
  addPDFHeader(doc, 'RELATÓRIO DE INCIDENTES — SSMA', empresa);

  const tipoLabels: Record<string, string> = {
    ACIDENTE: 'Acidente', QUASE_ACIDENTE: 'Quase Acidente',
    INCIDENTE_AMBIENTAL: 'Inc. Ambiental', DESVIO: 'Desvio',
  };
  const statusLabels: Record<string, string> = {
    ABERTO: 'Aberto', EM_INVESTIGACAO: 'Em Investigação',
    AGUARDANDO_ACOES: 'Aguard. Ações', ENCERRADO: 'Encerrado',
  };

  autoTable(doc, {
    startY: 30,
    head: [['Nº', 'Tipo', 'Severidade', 'Data', 'Local', 'Descrição', 'Afastamento (d)', 'Status']],
    body: incidentes.map(i => [
      String(i.numero_incidente),
      tipoLabels[i.tipo] || i.tipo,
      i.severidade,
      new Date(i.data_ocorrencia).toLocaleDateString('pt-BR'),
      i.local_ocorrencia || '—',
      i.descricao.length > 50 ? i.descricao.slice(0, 50) + '...' : i.descricao,
      i.dias_afastamento > 0 ? String(i.dias_afastamento) : '—',
      statusLabels[i.status] || i.status,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  });

  // Totalizadores
  const finalY = (doc as any).lastAutoTable?.finalY || 60;
  doc.setFontSize(8);
  doc.setTextColor(60);
  const acidentes = incidentes.filter(i => i.tipo === 'ACIDENTE').length;
  const afastados = incidentes.reduce((s, i) => s + (i.dias_afastamento || 0), 0);
  doc.text(`Total de registros: ${incidentes.length}   |   Acidentes: ${acidentes}   |   Total de dias de afastamento: ${afastados}`, 14, finalY + 8);

  doc.save(`relatorio-incidentes-ssma-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportIncidentesXLSX(incidentes: IncidenteSSMARow[]) {
  const ws = XLSX.utils.json_to_sheet(incidentes.map(i => ({
    'Nº': i.numero_incidente,
    'Tipo': i.tipo,
    'Severidade': i.severidade,
    'Data Ocorrência': new Date(i.data_ocorrencia).toLocaleDateString('pt-BR'),
    'Local': i.local_ocorrencia || '',
    'Descrição': i.descricao,
    'Pessoas Envolvidas': i.pessoas_envolvidas || '',
    'Ações Imediatas': i.acoes_imediatas || '',
    'Dias Afastamento': i.dias_afastamento,
    'Status': i.status,
    'Responsável': i.responsavel_nome || '',
    'Criado em': new Date(i.created_at).toLocaleDateString('pt-BR'),
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');
  XLSX.writeFile(wb, `incidentes-ssma-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// ── Relatório de Treinamentos ───────────────────────────────────────────────
export function exportTreinamentosPDF(treinamentos: TreinamentoSSMARow[], empresa?: DadosEmpresa | null) {
  const doc = new jsPDF({ orientation: 'landscape' });
  addPDFHeader(doc, 'MAPA DE TREINAMENTOS / NRs — SSMA', empresa);

  const statusColors: Record<string, [number, number, number]> = {
    VALIDO: [22, 163, 74],
    PROXIMO_VENCIMENTO: [202, 138, 4],
    VENCIDO: [220, 38, 38],
  };
  const statusLabels: Record<string, string> = {
    VALIDO: 'Válido', PROXIMO_VENCIMENTO: 'Vencendo', VENCIDO: 'Vencido',
  };

  autoTable(doc, {
    startY: 30,
    head: [['Colaborador', 'Tipo de Curso', 'Curso', 'Realização', 'Validade', 'Dias p/ Vencer', 'Status']],
    body: treinamentos.map(t => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dias = t.data_validade
        ? Math.ceil((new Date(t.data_validade + 'T00:00:00').getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return [
        t.colaborador_nome,
        t.tipo_curso,
        t.nome_curso,
        new Date(t.data_realizacao).toLocaleDateString('pt-BR'),
        t.data_validade ? new Date(t.data_validade).toLocaleDateString('pt-BR') : 'Sem validade',
        dias !== null ? (dias <= 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`) : '—',
        statusLabels[t.status] || t.status,
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    didDrawCell: (data) => {
      if (data.column.index === 6 && data.section === 'body') {
        const status = treinamentos[data.row.index]?.status;
        if (status && statusColors[status]) {
          const [r, g, b] = statusColors[status];
          doc.setTextColor(r, g, b);
          doc.setFontSize(8);
        }
      }
    },
    willDrawCell: (data) => {
      if (data.column.index !== 6 || data.section !== 'body') {
        doc.setTextColor(0);
      }
    },
  });

  doc.save(`mapa-treinamentos-ssma-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportTreinamentosXLSX(treinamentos: TreinamentoSSMARow[]) {
  const ws = XLSX.utils.json_to_sheet(treinamentos.map(t => ({
    'Colaborador': t.colaborador_nome,
    'Tipo de Curso': t.tipo_curso,
    'Nome do Curso': t.nome_curso,
    'Instituição': t.instituicao || '',
    'Carga Horária (h)': t.carga_horaria || '',
    'Data Realização': new Date(t.data_realizacao).toLocaleDateString('pt-BR'),
    'Data Validade': t.data_validade ? new Date(t.data_validade).toLocaleDateString('pt-BR') : '',
    'Nº Certificado': t.numero_certificado || '',
    'Status': t.status,
    'Observações': t.observacoes || '',
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Treinamentos');
  XLSX.writeFile(wb, `treinamentos-ssma-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// ── Relatório de Estoque EPI ────────────────────────────────────────────────
export function exportEstoqueEPIPDF(epis: EPIRow[], entregas: EntregaEPIRow[], empresa?: DadosEmpresa | null) {
  const doc = new jsPDF();
  addPDFHeader(doc, 'RELATÓRIO DE ESTOQUE DE EPIs', empresa);

  autoTable(doc, {
    startY: 30,
    head: [['EPI', 'Categoria', 'Nº CA', 'Fabricante', 'Validade CA', 'Estoque Atual', 'Estoque Mín.', 'Status']],
    body: epis.map(e => [
      e.nome,
      e.categoria.replace(/_/g, ' '),
      e.numero_ca || '—',
      e.fabricante || '—',
      e.validade_ca ? new Date(e.validade_ca).toLocaleDateString('pt-BR') : '—',
      String(e.estoque_atual),
      String(e.estoque_minimo),
      e.estoque_atual <= e.estoque_minimo ? 'BAIXO' : 'OK',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    didDrawCell: (data) => {
      if (data.column.index === 7 && data.section === 'body') {
        const epi = epis[data.row.index];
        if (epi && epi.estoque_atual <= epi.estoque_minimo) {
          doc.setTextColor(220, 38, 38);
        } else {
          doc.setTextColor(22, 163, 74);
        }
      }
    },
    willDrawCell: (data) => {
      if (data.column.index !== 7 || data.section !== 'body') doc.setTextColor(0);
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 60;
  const baixo = epis.filter(e => e.ativo && e.estoque_atual <= e.estoque_minimo).length;
  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.text(`Total de EPIs: ${epis.length}   |   Com estoque baixo: ${baixo}   |   Total de entregas registradas: ${entregas.length}`, 14, finalY + 8);

  doc.save(`estoque-epi-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportEstoqueEPIXLSX(epis: EPIRow[], entregas: EntregaEPIRow[]) {
  const wb = XLSX.utils.book_new();

  const wsEpis = XLSX.utils.json_to_sheet(epis.map(e => ({
    'Nome': e.nome,
    'Categoria': e.categoria,
    'Nº CA': e.numero_ca || '',
    'Fabricante': e.fabricante || '',
    'Validade CA': e.validade_ca ? new Date(e.validade_ca).toLocaleDateString('pt-BR') : '',
    'Estoque Atual': e.estoque_atual,
    'Estoque Mínimo': e.estoque_minimo,
    'Status': e.estoque_atual <= e.estoque_minimo ? 'BAIXO' : 'OK',
    'Ativo': e.ativo ? 'Sim' : 'Não',
  })));
  XLSX.utils.book_append_sheet(wb, wsEpis, 'Estoque EPIs');

  const wsEntregas = XLSX.utils.json_to_sheet(entregas.map(ent => ({
    'Colaborador': ent.colaborador_nome,
    'EPI ID': ent.epi_id,
    'Quantidade': ent.quantidade,
    'Data Entrega': new Date(ent.data_entrega).toLocaleDateString('pt-BR'),
    'Data Devolução': ent.data_devolucao ? new Date(ent.data_devolucao).toLocaleDateString('pt-BR') : '',
    'Motivo': ent.motivo || '',
    'Observações': ent.observacoes || '',
  })));
  XLSX.utils.book_append_sheet(wb, wsEntregas, 'Histórico Entregas');

  XLSX.writeFile(wb, `epi-completo-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// ── Relatório FISPQs ────────────────────────────────────────────────────────
export function exportFISPQsXLSX(fichas: FichaSegurancaRow[]) {
  const ws = XLSX.utils.json_to_sheet(fichas.map(f => ({
    'Código': f.codigo || '',
    'Produto': f.nome_produto,
    'Fabricante': f.fabricante || '',
    'Classificação GHS': f.classificacao_ghs || '',
    'Perigos': f.perigos_principais || '',
    'EPI Recomendado': f.epi_recomendado || '',
    'Validade': f.data_validade ? new Date(f.data_validade).toLocaleDateString('pt-BR') : '',
    'Arquivo URL': f.arquivo_url || '',
    'Status': f.ativo ? 'Ativa' : 'Inativa',
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'FISPQs');
  XLSX.writeFile(wb, `fispqs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
