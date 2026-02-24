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
  empresaCnpj?: string;
  empresaTelefone?: string;
  empresaEmail?: string;
  empresaEndereco?: string;
  logoUrl?: string;
  layoutVersion?: string;
}

function addProfessionalHeader(doc: jsPDF, options: ReportOptions, startY: number = 15): number {
  const { empresaNome, empresaCnpj, empresaTelefone, empresaEmail, title, layoutVersion } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });

  // Company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaNome || 'MANUTENÇÃO INDUSTRIAL', 14, startY);

  // Company details
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const details: string[] = [];
  if (empresaCnpj) details.push(`CNPJ: ${empresaCnpj}`);
  if (empresaTelefone) details.push(`Tel: ${empresaTelefone}`);
  if (empresaEmail) details.push(empresaEmail);
  if (details.length > 0) {
    doc.text(details.join('  •  '), 14, startY + 5);
  }

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, startY + 13);

  // Period + generation info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (options.dateFrom && options.dateTo) {
    doc.text(`Período: ${options.dateFrom} a ${options.dateTo}`, 14, startY + 18);
  }
  doc.text(`Emitido em: ${now}`, pageWidth - 14, startY + 18, { align: 'right' });

  // Divider line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, startY + 21, pageWidth - 14, startY + 21);

  doc.setTextColor(0, 0, 0);
  return startY + 25;
}

function addProfessionalFooter(doc: jsPDF, options: ReportOptions) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');

    // Left: company + address
    doc.text(
      options.empresaNome || '',
      14, pageHeight - 8
    );

    // Right: page + version
    const versionText = options.layoutVersion ? `Versão ${options.layoutVersion} • ` : '';
    doc.text(
      `${versionText}Página ${i} de ${pageCount}`,
      pageWidth - 14, pageHeight - 8, { align: 'right' }
    );

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
  }
}

export function generateOSReportPDF(
  ordensServico: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = addProfessionalHeader(doc, options);

  const filtered = ordensServico.filter(os => {
    const d = os.data_solicitacao?.slice(0, 10);
    if (d < options.dateFrom || d > options.dateTo) return false;
    if (options.filterTag && !os.tag.includes(options.filterTag)) return false;
    return true;
  });

  // Summary
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de registros: ${filtered.length}`, 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Nº OS', 'TAG', 'Equipamento', 'Tipo', 'Prioridade', 'Status', 'Data']],
    body: filtered.map(os => [
      String(os.numero_os).padStart(6, '0'),
      os.tag,
      os.equipamento?.substring(0, 30),
      os.tipo,
      os.prioridade,
      os.status,
      os.data_solicitacao ? format(new Date(os.data_solicitacao), 'dd/MM/yyyy') : '',
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [40, 55, 75], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  });

  addProfessionalFooter(doc, options);
  doc.save(`${options.title.replace(/\s+/g, '_')}_${options.dateFrom}_${options.dateTo}.pdf`);
}

export function generateIndicadoresPDF(
  indicadores: any,
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = addProfessionalHeader(doc, { ...options, dateFrom: '', dateTo: '' });

  autoTable(doc, {
    startY,
    head: [['Indicador', 'Valor', 'Unidade']],
    body: [
      ['MTBF', indicadores?.mtbf?.toFixed(1) || 'N/A', 'horas'],
      ['MTTR', indicadores?.mttr?.toFixed(1) || 'N/A', 'horas'],
      ['Disponibilidade', indicadores?.disponibilidade?.toFixed(1) || 'N/A', '%'],
      ['Backlog (quantidade)', String(indicadores?.backlogQuantidade || 0), 'OS'],
      ['Backlog (horas)', String(indicadores?.backlogHoras || 0), 'horas'],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [40, 55, 75], fontStyle: 'bold' },
    columnStyles: { 1: { fontStyle: 'bold', halign: 'center' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });

  addProfessionalFooter(doc, options);
  doc.save(`Indicadores_KPI_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

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

export function generateEquipmentTemplate() {
  const headers = [
    'TAG', 'Nome do Equipamento', 'Setor/Localização', 'Fabricante', 'Modelo',
    'Número de Série', 'Data de Instalação (DD/MM/AAAA)', 'Criticidade (A/B/C)',
    'Nível de Risco (CRITICO/ALTO/MEDIO/BAIXO)', 'Observações',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ['COMP-001', 'Compressor Principal', 'Área 1', 'Atlas Copco', 'GA-90', 'SN123456', '01/01/2020', 'A', 'ALTO', '']]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 20) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos');
  XLSX.writeFile(wb, 'Modelo_Cadastro_Equipamentos.xlsx');
}

export function generateLubrificacaoPlanoPDF(
  planos: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = addProfessionalHeader(doc, options);

  doc.setFontSize(10);
  doc.text(`Total de planos: ${planos.length}`, 14, startY);

  autoTable(doc, {
    startY: startY + 6,
    head: [['Código', 'Nome', 'TAG', 'Ponto', 'Lubrificante', 'Periodicidade', 'Próxima Execução']],
    body: planos.map(p => [p.codigo, p.nome, p.tag || '', p.ponto || '', p.tipo_lubrificante || '', `${p.periodicidade_valor || ''} ${p.periodicidade_tipo || ''}`, p.proxima_execucao ? format(new Date(p.proxima_execucao), 'dd/MM/yyyy') : '']),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 55, 75], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  addProfessionalFooter(doc, options);
  doc.save(`Planos_Lubrificacao_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export function generateLubrificacaoConsumptionExcel(
  data: any[],
  fileName = 'Consumo_Lubrificante'
) {
  const columns = [
    'Data', 'Plano', 'Equipamento', 'TAG', 'Lubrificante', 'Quantidade Utilizada'
  ];
  const wsData = [columns, ...data.map(d => [d.data_execucao ? format(new Date(d.data_execucao), 'dd/MM/yyyy') : '', d.plano_nome || '', d.equipamento || '', d.tag || '', d.tipo_lubrificante || '', d.quantidade_utilizada ?? ''])];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consumo');
  ws['!cols'] = columns.map(() => ({ wch: 20 }));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
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
            errors.push({ row: i + 1, reason: `Criticidade inválida: ${criticidade}` });
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
