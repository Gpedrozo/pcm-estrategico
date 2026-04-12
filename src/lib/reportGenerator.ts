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

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) return null;

  try {
    const response = await fetch(normalizedUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function addProfessionalHeader(doc: jsPDF, options: ReportOptions, startY: number = 15): Promise<number> {
  const { empresaNome, empresaCnpj, empresaTelefone, empresaEmail, title } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  const logoDataUrl = await loadImageAsDataUrl(options.logoUrl || '');
  const logoWidth = 20;
  const logoHeight = 12;
  const textStartX = logoDataUrl ? 38 : 14;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 14, startY - 1, logoWidth, logoHeight);
  }

  // Company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaNome || 'MANUTENÇÃO INDUSTRIAL', textStartX, startY);

  // Company details
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const details: string[] = [];
  if (empresaCnpj) details.push(`CNPJ: ${empresaCnpj}`);
  if (empresaTelefone) details.push(`Tel: ${empresaTelefone}`);
  if (empresaEmail) details.push(empresaEmail);
  if (details.length > 0) {
    doc.text(details.join('  •  '), textStartX, startY + 5);
  }

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, textStartX, startY + 13);

  // Period + generation info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (options.dateFrom && options.dateTo) {
    doc.text(`Período: ${options.dateFrom} a ${options.dateTo}`, textStartX, startY + 18);
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

export async function generateOSReportPDF(
  ordensServico: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);

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

export async function generateIndicadoresPDF(
  indicadores: any,
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, { ...options, dateFrom: '', dateTo: '' });

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

export function generateEquipmentTechnicalTemplate() {
  const headers = [
    'NIVEL', 'COMPONENTE', 'ESPECIFICAÇÃO TÉCNICA', 'MATERIAL',
    'DIMENSÃO / MODELO', 'NORMA / FABRICANTE', 'QTD', 'UNIDADE', 'TAG_ATIVO', 'OBSERVAÇÕES',
  ];
  // NIVEL usa notação de ponto para indicar hierarquia:
  // 1 = componente raiz, 1.1 = subcomponente, 1.1.1 = sub-subcomponente, etc.
  const samples = [
    ['1',         'Motor Principal',     'Motor trifásico 75kW',  'Aço', '75kW/4P',   'WEG',  '1', 'un', 'ELV-001', 'Componente raiz nível 1'],
    ['1.1',       'Estator',             'Enrolamento trifásico',  '',    '',           '',     '1', 'un', 'ELV-001', 'Subcomponente nível 1.1'],
    ['1.1.1',     'Bobina Fase A',       'Cobre esmaltado 2,5mm²','Cu',  '2,5mm²',    'ABNT', '3', 'un', 'ELV-001', 'Nível 1.1.1'],
    ['1.1.1.1',   'Fio de cobre',        'Condutor sólido',        'Cu',  '2,5mm',     'NBR',  '1', 'm',  'ELV-001', 'Nível 1.1.1.1'],
    ['2',         'Rolamento do Mancal', 'Rolamento autocomp.',    'Aço', '22210',     'SKF',  '2', 'un', 'ELV-001', ''],
    ['2.1',       'Retentor',            'Vedação',                'NBR', '60x80x10',  'SKF',  '1', 'un', 'ELV-001', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...samples]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 22) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ComponentesTecnicos');
  XLSX.writeFile(wb, 'Modelo_Tecnico_Ativos_Componentes.xlsx');
}

export async function generateLubrificacaoPlanoPDF(
  planos: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);

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

export function parseEquipmentFile(file: File): Promise<{ valid: any[]; componentesByTag: Record<string, any[]>; errors: { row: number; reason: string }[] }> {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error('Arquivo excede o limite de 10 MB'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

        if (rows.length < 2) {
          resolve({ valid: [], errors: [{ row: 1, reason: 'Planilha vazia' }] });
          return;
        }

        const valid: any[] = [];
        const componentesByTag: Record<string, any[]> = {};
        const errors: { row: number; reason: string }[] = [];

        const firstRowHeaders = rows[0].map((c) => String(c || '').trim().toUpperCase());
        const isTechnicalModel =
          (firstRowHeaders.includes('NIVEL') ||
            (firstRowHeaders.includes('ITEM') && firstRowHeaders.includes('SUBITEM'))) &&
          firstRowHeaders.includes('COMPONENTE') &&
          firstRowHeaders.includes('TAG_ATIVO');

        if (isTechnicalModel) {
          // Detecta se é o novo formato (NIVEL) ou o antigo (ITEM + SUBITEM)
          const usesNivelFormat = firstRowHeaders.includes('NIVEL');
          const equipmentByTag = new Map<string, any>();

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            let nivelCode: string;
            let componenteNome: string;
            let tag: string;
            let especTecnica: string;
            let material: string;
            let dimModelo: string;
            let fabricante: string;
            let qtd: number;
            let unidade: string;
            let observacoes: string;

            if (usesNivelFormat) {
              // NIVEL | COMPONENTE | ESPEC | MATERIAL | DIM/MODELO | FABRICANTE | QTD | UNIDADE | TAG_ATIVO | OBS
              nivelCode      = String(row[0] || '').trim();
              componenteNome = String(row[1] || '').trim();
              especTecnica   = String(row[2] || '').trim();
              material       = String(row[3] || '').trim();
              dimModelo      = String(row[4] || '').trim();
              fabricante     = String(row[5] || '').trim();
              qtd            = Number(row[6] || 1) || 1;
              unidade        = String(row[7] || '').trim();
              tag            = String(row[8] || '').trim().toUpperCase();
              observacoes    = String(row[9] || '').trim();
            } else {
              // ITEM | SUBITEM | COMPONENTE | ESPEC | MATERIAL | DIM/MODELO | FABRICANTE | QTD | UNIDADE | TAG_ATIVO | OBS
              const item     = String(row[0] || '').trim();
              const subitem  = String(row[1] || '').trim();
              nivelCode      = subitem ? `${item}.${subitem}` : item;
              componenteNome = String(row[2] || '').trim();
              especTecnica   = String(row[3] || '').trim();
              material       = String(row[4] || '').trim();
              dimModelo      = String(row[5] || '').trim();
              fabricante     = String(row[6] || '').trim();
              qtd            = Number(row[7] || 1) || 1;
              unidade        = String(row[8] || '').trim();
              tag            = String(row[9] || '').trim().toUpperCase();
              observacoes    = String(row[10] || '').trim();
            }

            if (!componenteNome && !tag) continue;

            if (!tag) {
              errors.push({ row: i + 1, reason: 'TAG_ATIVO vazio no modelo técnico' });
              continue;
            }

            if (!nivelCode) {
              errors.push({ row: i + 1, reason: 'NIVEL vazio' });
              continue;
            }

            if (!equipmentByTag.has(tag)) {
              equipmentByTag.set(tag, {
                tag,
                nome: `Ativo ${tag}`,
                localizacao: null,
                fabricante: null,
                modelo: null,
                numero_serie: null,
                criticidade: 'C',
                nivel_risco: 'BAIXO',
              });
            }

            if (componenteNome) {
              // Determina o pai removendo o último segmento do nível
              // Ex: "1.1.1" -> pai é "1.1"; "1" -> sem pai (raiz)
              const nivelParts = nivelCode.split('.');
              const parentNivelCode = nivelParts.length > 1 ? nivelParts.slice(0, -1).join('.') : null;

              if (!componentesByTag[tag]) componentesByTag[tag] = [];
              componentesByTag[tag].push({
                nivelCode,
                parentNivelCode,
                codigo: `${tag}-${nivelCode}`,
                nome: componenteNome,
                tipo: 'OUTRO',
                fabricante: fabricante || null,
                modelo: dimModelo || null,
                quantidade: qtd,
                observacoes: observacoes || null,
                especificacoes: {
                  nivel: nivelCode,
                  especificacao_tecnica: especTecnica,
                  material,
                  unidade,
                },
              });
            }
          }

          resolve({ valid: Array.from(equipmentByTag.values()), componentesByTag, errors });
          return;
        }

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

        resolve({ valid, componentesByTag, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
}
