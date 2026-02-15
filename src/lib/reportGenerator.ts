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
}

export function generateOSReportPDF(
  ordensServico: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const { title, dateFrom, dateTo, empresaNome } = options;

  // Header
  doc.setFontSize(16);
  doc.text(empresaNome || 'PCM Estratégico', 14, 20);
  doc.setFontSize(12);
  doc.text(title, 14, 28);
  doc.setFontSize(9);
  doc.text(`Período: ${dateFrom} a ${dateTo}`, 14, 34);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 39);

  const filtered = ordensServico.filter(os => {
    const d = os.data_solicitacao?.slice(0, 10);
    if (d < dateFrom || d > dateTo) return false;
    if (options.filterTag && !os.tag.includes(options.filterTag)) return false;
    return true;
  });

  autoTable(doc, {
    startY: 45,
    head: [['Nº OS', 'TAG', 'Equipamento', 'Tipo', 'Prioridade', 'Status', 'Data']],
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

  doc.save(`${title.replace(/\s+/g, '_')}_${dateFrom}_${dateTo}.pdf`);
}

export function generateIndicadoresPDF(
  indicadores: any,
  options: ReportOptions
) {
  const doc = new jsPDF();
  const { title, empresaNome } = options;

  doc.setFontSize(16);
  doc.text(empresaNome || 'PCM Estratégico', 14, 20);
  doc.setFontSize(12);
  doc.text(title, 14, 28);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 34);

  autoTable(doc, {
    startY: 42,
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
  
  // Auto-width columns
  const colWidths = columns.map((c, i) => {
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
