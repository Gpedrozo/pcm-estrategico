import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportOptions {
  title: string;
  dateFrom: string;
  dateTo: string;
  filterTag?: string;
  empresaNome?: string;
  logoUrl?: string;
  cnpj?: string;
  endereco?: string;
  rodape?: string;
}

interface EmpresaData {
  nome_fantasia?: string;
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  logo_relatorio_url?: string;
  rodape_padrao?: string;
}

// --- Standardized Report Header with Logo ---
function addReportHeader(doc: jsPDF, options: ReportOptions): number {
  const { title, empresaNome, cnpj, endereco, dateFrom, dateTo } = options;
  let y = 15;

  // Company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaNome || 'PCM Estrategico', 14, y);
  y += 6;

  // CNPJ and address
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (cnpj) {
    doc.text(`CNPJ: ${cnpj}`, 14, y);
    y += 4;
  }
  if (endereco) {
    doc.text(endereco, 14, y);
    y += 4;
  }

  // Divider line
  y += 2;
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 6;

  // Report title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  y += 6;

  // Period and generation date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (dateFrom && dateTo) {
    doc.text(`Periodo: ${dateFrom} a ${dateTo}`, 14, y);
  }
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 120, y);
  y += 8;

  return y;
}

function addReportFooter(doc: jsPDF, options: ReportOptions) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    const footer = options.rodape || `${options.empresaNome || 'PCM Estrategico'} - Sistema de Gestao de Manutencao`;
    doc.text(footer, 14, 285);
    doc.text(`Pagina ${i} de ${pageCount}`, 170, 285);
    doc.setTextColor(0, 0, 0);
  }
}

function buildReportOptions(options: ReportOptions, empresa?: EmpresaData): ReportOptions {
  return {
    ...options,
    empresaNome: options.empresaNome || empresa?.nome_fantasia || empresa?.razao_social || 'PCM Estrategico',
    cnpj: options.cnpj || empresa?.cnpj,
    endereco: options.endereco || empresa?.endereco,
    rodape: options.rodape || empresa?.rodape_padrao,
  };
}

// --- OS Report ---
export function generateOSReportPDF(ordensServico: any[], options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, options);

  const filtered = ordensServico.filter(os => {
    const d = os.data_solicitacao?.slice(0, 10);
    if (d < options.dateFrom || d > options.dateTo) return false;
    if (options.filterTag && !os.tag.includes(options.filterTag)) return false;
    return true;
  });

  autoTable(doc, {
    startY,
    head: [['N. OS', 'TAG', 'Equipamento', 'Tipo', 'Prioridade', 'Status', 'Data']],
    body: filtered.map(os => [
      String(os.numero_os).padStart(4, '0'),
      os.tag,
      os.equipamento?.substring(0, 25),
      os.tipo,
      os.prioridade,
      os.status,
      os.data_solicitacao ? format(new Date(os.data_solicitacao), 'dd/MM/yyyy') : '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  addReportFooter(doc, options);
  doc.save(`${options.title.replace(/\s+/g, '_')}_${options.dateFrom}_${options.dateTo}.pdf`);
}

// --- Indicadores KPI Report ---
export function generateIndicadoresPDF(indicadores: any, options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, options);

  autoTable(doc, {
    startY,
    head: [['Indicador', 'Valor']],
    body: [
      ['MTBF (horas)', indicadores?.mtbf?.toFixed(1) || 'N/A'],
      ['MTTR (horas)', indicadores?.mttr?.toFixed(1) || 'N/A'],
      ['Disponibilidade (%)', indicadores?.disponibilidade?.toFixed(1) || 'N/A'],
      ['Backlog (qtd)', String(indicadores?.backlogQuantidade || 0)],
      ['Backlog (horas)', String(indicadores?.backlogHoras || 0)],
    ],
    headStyles: { fillColor: [41, 128, 185] },
  });

  addReportFooter(doc, options);
  doc.save(`Indicadores_KPI_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

// --- Preventiva Report ---
export function generatePreventivaReportPDF(planos: any[], options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, { ...options, title: 'Relatorio de Manutencao Preventiva' });

  autoTable(doc, {
    startY,
    head: [['TAG', 'Equipamento', 'Tipo Manutencao', 'Frequencia (dias)', 'Proxima Execucao', 'Status']],
    body: planos.map(p => [
      p.tag || '',
      p.equipamento || '',
      p.tipo_manutencao || '',
      String(p.frequencia_dias || ''),
      p.proxima_execucao ? format(new Date(p.proxima_execucao), 'dd/MM/yyyy') : 'N/A',
      p.ativo ? 'Ativo' : 'Inativo',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [39, 174, 96] },
  });

  addReportFooter(doc, options);
  doc.save(`Preventiva_${options.dateFrom}_${options.dateTo}.pdf`);
}

// --- Preditiva Report ---
export function generatePreditivaReportPDF(medicoes: any[], options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, { ...options, title: 'Relatorio de Manutencao Preditiva' });

  const filtered = medicoes.filter(m => {
    const d = m.data_medicao?.slice(0, 10);
    if (d < options.dateFrom || d > options.dateTo) return false;
    if (options.filterTag && !m.tag?.includes(options.filterTag)) return false;
    return true;
  });

  autoTable(doc, {
    startY,
    head: [['TAG', 'Tipo Medicao', 'Valor', 'Unidade', 'Limite', 'Alerta', 'Data']],
    body: filtered.map(m => [
      m.tag || '',
      m.tipo_medicao || '',
      String(m.valor || ''),
      m.unidade || '',
      String(m.limite_alerta || ''),
      m.valor > m.limite_alerta ? 'ACIMA' : 'Normal',
      m.data_medicao ? format(new Date(m.data_medicao), 'dd/MM/yyyy') : '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [142, 68, 173] },
  });

  addReportFooter(doc, options);
  doc.save(`Preditiva_${options.dateFrom}_${options.dateTo}.pdf`);
}

// --- Inspecao Report ---
export function generateInspecaoReportPDF(inspecoes: any[], options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, { ...options, title: 'Relatorio de Inspecoes' });

  const filtered = inspecoes.filter(i => {
    const d = i.data_inspecao?.slice(0, 10);
    if (d < options.dateFrom || d > options.dateTo) return false;
    if (options.filterTag && !i.tag?.includes(options.filterTag)) return false;
    return true;
  });

  autoTable(doc, {
    startY,
    head: [['TAG', 'Tipo', 'Resultado', 'Anomalias', 'Responsavel', 'Data']],
    body: filtered.map(i => [
      i.tag || '',
      i.tipo_inspecao || '',
      i.resultado || '',
      String(i.anomalias_encontradas?.length || 0),
      i.responsavel || '',
      i.data_inspecao ? format(new Date(i.data_inspecao), 'dd/MM/yyyy') : '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [243, 156, 18] },
  });

  addReportFooter(doc, options);
  doc.save(`Inspecoes_${options.dateFrom}_${options.dateTo}.pdf`);
}

// --- FMEA Report ---
export function generateFMEAReportPDF(fmeas: any[], options: ReportOptions) {
  const doc = new jsPDF('landscape');
  const startY = addReportHeader(doc, { ...options, title: 'Relatorio FMEA' });

  autoTable(doc, {
    startY,
    head: [['TAG', 'Componente', 'Modo Falha', 'Efeito', 'Severidade', 'Ocorrencia', 'Deteccao', 'RPN', 'Acao']],
    body: fmeas.map(f => [
      f.tag || '',
      f.componente || '',
      f.modo_falha || '',
      (f.efeito_falha || '').substring(0, 30),
      String(f.severidade || 0),
      String(f.ocorrencia || 0),
      String(f.deteccao || 0),
      String((f.severidade || 0) * (f.ocorrencia || 0) * (f.deteccao || 0)),
      (f.acao_recomendada || '').substring(0, 30),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [192, 57, 43] },
  });

  addReportFooter(doc, options);
  doc.save(`FMEA_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

// --- RCA Report ---
export function generateRCAReportPDF(rcas: any[], options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, { ...options, title: 'Relatorio de Analise de Causa Raiz' });

  const filtered = rcas.filter(r => {
    const d = r.data_analise?.slice(0, 10) || r.created_at?.slice(0, 10);
    if (d < options.dateFrom || d > options.dateTo) return false;
    return true;
  });

  autoTable(doc, {
    startY,
    head: [['TAG', 'Equipamento', 'Descricao', 'Metodo', 'Causa Raiz', 'Status', 'Data']],
    body: filtered.map(r => [
      r.tag || '',
      r.equipamento || '',
      (r.descricao_problema || '').substring(0, 30),
      r.metodo_analise || '',
      (r.causa_raiz_principal || '').substring(0, 30),
      r.status || '',
      r.data_analise ? format(new Date(r.data_analise), 'dd/MM/yyyy') : '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [231, 76, 60] },
  });

  addReportFooter(doc, options);
  doc.save(`RCA_${options.dateFrom}_${options.dateTo}.pdf`);
}

// --- SSMA Report ---
export function generateSSMAReportPDF(incidentes: any[], options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, { ...options, title: 'Relatorio SSMA - Seguranca e Saude' });

  const filtered = incidentes.filter(i => {
    const d = i.data_incidente?.slice(0, 10) || i.created_at?.slice(0, 10);
    if (d < options.dateFrom || d > options.dateTo) return false;
    return true;
  });

  autoTable(doc, {
    startY,
    head: [['Tipo', 'Descricao', 'Local', 'Gravidade', 'Status', 'Data']],
    body: filtered.map(i => [
      i.tipo || '',
      (i.descricao || '').substring(0, 40),
      i.local || '',
      i.gravidade || '',
      i.status || '',
      i.data_incidente ? format(new Date(i.data_incidente), 'dd/MM/yyyy') : '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [230, 126, 34] },
  });

  addReportFooter(doc, options);
  doc.save(`SSMA_${options.dateFrom}_${options.dateTo}.pdf`);
}

// --- Lubrificacao Report ---
export function generateLubrificacaoReportPDF(registros: any[], options: ReportOptions) {
  const doc = new jsPDF();
  const startY = addReportHeader(doc, { ...options, title: 'Relatorio de Lubrificacao Estrategica' });

  autoTable(doc, {
    startY,
    head: [['TAG', 'Lubrificante', 'Tipo', 'Quantidade', 'Responsavel', 'Data']],
    body: registros.map(r => [
      r.tag || '',
      r.lubrificante || '',
      r.tipo_aplicacao || '',
      r.quantidade || '',
      r.responsavel || '',
      r.data_aplicacao ? format(new Date(r.data_aplicacao), 'dd/MM/yyyy') : '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [52, 152, 219] },
  });

  addReportFooter(doc, options);
  doc.save(`Lubrificacao_${options.dateFrom}_${options.dateTo}.pdf`);
}

// --- Excel Export ---
export function generateExcelReport(
  data: any[],
  columns: { header: string; key: string }[],
  fileName: string
) {
  const wsData = [
    columns.map(c => c.header),
    ...data.map(row => columns.map(c => row[c.key] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  
  const colWidths = columns.map((c, _i) => {
    const maxLen = Math.max(c.header.length, ...data.map(r => String(r[c.key] ?? '').length));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;
  
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// --- Equipment Template ---
export function generateEquipmentTemplate() {
  const headers = [
    'TAG', 'Nome do Equipamento', 'Setor/Localizacao', 'Fabricante', 'Modelo',
    'Numero de Serie', 'Data de Instalacao (DD/MM/AAAA)', 'Criticidade (A/B/C)',
    'Nivel de Risco (CRITICO/ALTO/MEDIO/BAIXO)', 'Observacoes',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ['COMP-001', 'Compressor Principal', 'Area 1', 'Atlas Copco', 'GA-90', 'SN123456', '01/01/2020', 'A', 'ALTO', '']]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 20) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos');
  XLSX.writeFile(wb, 'Modelo_Cadastro_Equipamentos.xlsx');
}

export function parseEquipmentFile(file: File): Promise<{ valid: any[]; errors: { row: number; reason: string }[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (rows.length < 2) {
          resolve({ valid: [], errors: [{ row: 1, reason: 'Planilha vazia' }] });
          return;
        }

        const valid: any[] = [];
        const errors: { row: number; reason: string }[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[0]) continue;
          
          const tag = String(row[0]).trim();
          const nome = String(row[1] || '').trim();
          
          if (!tag) { errors.push({ row: i + 1, reason: 'TAG vazia' }); continue; }
          if (!nome) { errors.push({ row: i + 1, reason: 'Nome vazio' }); continue; }
          
          const criticidade = String(row[7] || 'C').trim().toUpperCase();
          if (!['A', 'B', 'C'].includes(criticidade)) {
            errors.push({ row: i + 1, reason: `Criticidade invalida: ${criticidade}` });
            continue;
          }

          valid.push({
            tag,
            nome,
            localizacao: String(row[2] || '').trim() || null,
            fabricante: String(row[3] || '').trim() || null,
            modelo: String(row[4] || '').trim() || null,
            numero_serie: String(row[5] || '').trim() || null,
            criticidade,
            nivel_risco: String(row[8] || 'BAIXO').trim().toUpperCase(),
          });
        }

        resolve({ valid, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
}
