import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ReportOptions {
  title: string;
  subtitle?: string;
  dateFrom: string;
  dateTo: string;
  filterTag?: string;
  filterTipo?: string;
  filterStatus?: string;
  observacoes?: string;
  // Dados do tenant
  empresaNome?: string;
  empresaRazaoSocial?: string;
  empresaCnpj?: string;
  empresaIE?: string;
  empresaTelefone?: string;
  empresaWhatsapp?: string;
  empresaEmail?: string;
  empresaSite?: string;
  empresaEndereco?: string;
  empresaCidade?: string;
  empresaEstado?: string;
  empresaCep?: string;
  empresaResponsavelNome?: string;
  empresaResponsavelCargo?: string;
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

// ─── Paleta — Modelo D: Laudo Industrial Compacto ────────────
const BRAND: [number, number, number] = [30, 35, 45];   // quase-preto (cabeçalho de tabelas)
const DARK: [number, number, number]  = [25, 30, 40];   // títulos e linhas estruturais
const MGRAY: [number, number, number] = [100, 100, 100]; // metadados e labels

function buildAddress(o: ReportOptions): string {
  const parts: string[] = [];
  if (o.empresaEndereco) parts.push(o.empresaEndereco);
  const cs = [o.empresaCidade, o.empresaEstado].filter(Boolean).join('/');
  if (cs) parts.push(cs);
  if (o.empresaCep) parts.push(`CEP ${o.empresaCep}`);
  return parts.join(' — ');
}

// Bloco de resumo KPI — linha única compacta (estilo laudo)
function drawKPISummary(
  doc: jsPDF,
  label: string,
  items: string[],
  y: number,
  LEFT: number,
  pageWidth: number
): number {
  doc.setDrawColor(140, 140, 140); doc.setLineWidth(0.3);
  doc.line(LEFT, y, pageWidth - LEFT, y);
  y += 4.5;
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text(label, LEFT, y);
  y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(35, 35, 35);
  doc.text(items.join('   |   '), LEFT, y);
  y += 4;
  doc.setDrawColor(140, 140, 140); doc.setLineWidth(0.3);
  doc.line(LEFT, y, pageWidth - LEFT, y);
  return y + 3;
}

async function addProfessionalHeader(doc: jsPDF, options: ReportOptions, startY: number = 8): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const LEFT = 14;
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const logoDataUrl = await loadImageAsDataUrl(options.logoUrl || '');
  const LOGO_W = 26, LOGO_H = 15;

  // ═══ Linha grossa superior
  doc.setDrawColor(...DARK); doc.setLineWidth(1.5);
  doc.line(LEFT, startY, pageWidth - LEFT, startY);

  let y = startY + 6;
  const textX = logoDataUrl ? LEFT + LOGO_W + 5 : LEFT;

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', LEFT, y - 1, LOGO_W, LOGO_H); } catch {/* */}
  }

  // Nome da empresa
  const nome = options.empresaNome || options.empresaRazaoSocial || 'PCM ESTRATÉGICO';
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text(nome, textX, y + 4);

  // CNPJ / IE à direita
  const fiscal = [
    options.empresaCnpj ? `CNPJ: ${options.empresaCnpj}` : '',
    options.empresaIE   ? `I.E.: ${options.empresaIE}`   : '',
  ].filter(Boolean).join('  |  ');
  if (fiscal) {
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MGRAY);
    doc.text(fiscal, pageWidth - LEFT, y + 4, { align: 'right' });
  }

  y += 9;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MGRAY);

  if (options.empresaRazaoSocial && options.empresaRazaoSocial !== nome) {
    doc.text(options.empresaRazaoSocial, textX, y); y += 4;
  }
  const addr = buildAddress(options);
  if (addr) { doc.text(addr, textX, y); y += 4; }

  const contacts = [
    options.empresaTelefone ? `Tel: ${options.empresaTelefone}` : '',
    options.empresaWhatsapp && options.empresaWhatsapp !== options.empresaTelefone
      ? `WhatsApp: ${options.empresaWhatsapp}` : '',
    options.empresaEmail || '',
    options.empresaSite  || '',
  ].filter(Boolean).join('  |  ');
  if (contacts) { doc.text(contacts, textX, y); y += 4; }

  // ─── Linha média
  const divY = Math.max(y + 1, logoDataUrl ? startY + LOGO_H + 8 : y + 1);
  doc.setDrawColor(...DARK); doc.setLineWidth(0.7);
  doc.line(LEFT, divY, pageWidth - LEFT, divY);
  y = divY + 5;

  // Título do relatório
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text(`RELATÓRIO: ${options.title.toUpperCase()}`, LEFT, y);

  // Referência à direita
  const refCode = `Doc.: ${options.title.replace(/\s+/g, '-').substring(0, 14).toUpperCase()}-${format(new Date(), 'yyyyMM')}`;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MGRAY);
  doc.text(refCode, pageWidth - LEFT, y, { align: 'right' });
  y += 5;

  // Período  ·  Emissão  ·  Responsável
  const periodo = (options.dateFrom && options.dateTo)
    ? `Período: ${format(new Date(options.dateFrom + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(options.dateTo + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}`
    : '';
  const metaLine = [
    periodo,
    `Emissão: ${now}`,
    options.empresaResponsavelNome ? `Responsável: ${options.empresaResponsavelNome}` : '',
  ].filter(Boolean).join('   ·   ');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
  doc.text(metaLine, LEFT, y);
  y += 4;

  if (options.subtitle) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...MGRAY);
    doc.text(options.subtitle, LEFT, y); y += 4;
  }

  // ─── Linha fina inferior
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.3);
  doc.line(LEFT, y, pageWidth - LEFT, y);
  y += 4;

  if (options.observacoes) {
    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(70, 70, 70);
    doc.text(`Obs.: ${options.observacoes}`, LEFT, y);
    y += 5;
    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.3);
    doc.line(LEFT, y - 1, pageWidth - LEFT, y - 1);
    y += 3;
  }

  doc.setTextColor(0, 0, 0);
  return y;
}

function addProfessionalFooter(doc: jsPDF, options: ReportOptions) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const LEFT = 14;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Linha dupla — rodapé
    doc.setDrawColor(...DARK); doc.setLineWidth(0.7);
    doc.line(LEFT, pageHeight - 13, pageWidth - LEFT, pageHeight - 13);
    doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.2);
    doc.line(LEFT, pageHeight - 12.2, pageWidth - LEFT, pageHeight - 12.2);

    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    const empresa  = options.empresaNome || '';
    const cnpjStr  = options.empresaCnpj ? `  —  CNPJ ${options.empresaCnpj}` : '';
    doc.text(`${empresa}${cnpjStr}`, LEFT, pageHeight - 8);

    const versionText = options.layoutVersion ? `v${options.layoutVersion}  |  ` : '';
    doc.text(`${versionText}Pág. ${i} de ${pageCount}`, pageWidth - LEFT, pageHeight - 8, { align: 'right' });

    if (i === pageCount && options.empresaResponsavelNome) {
      const signX = pageWidth / 2;
      doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.3);
      doc.line(signX - 35, pageHeight - 4.5, signX + 35, pageHeight - 4.5);
      doc.setFontSize(6); doc.setTextColor(80, 80, 80);
      doc.text(
        `${options.empresaResponsavelNome}${options.empresaResponsavelCargo ? '  —  ' + options.empresaResponsavelCargo : ''}`,
        signX, pageHeight - 2, { align: 'center' }
      );
    }
  }
}

export async function generateOSReportPDF(
  ordensServico: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);
  const LEFT = 14;

  const filtered = ordensServico.filter(os => {
    const d = os.data_solicitacao?.slice(0, 10);
    if (!d || d < options.dateFrom || d > options.dateTo) return false;
    if (options.filterTag && !os.tag?.includes(options.filterTag.toUpperCase())) return false;
    if (options.filterTipo && os.tipo !== options.filterTipo) return false;
    if (options.filterStatus && os.status !== options.filterStatus) return false;
    return true;
  });

  // Resumo operacional
  const totalOS = filtered.length;
  const fechadas = filtered.filter(o => o.status === 'FECHADA').length;
  const abertas = filtered.filter(o => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length;
  const corretivas = filtered.filter(o => o.tipo === 'CORRETIVA').length;
  const preventivas = filtered.filter(o => o.tipo === 'PREVENTIVA').length;
  const pageWidth = doc.internal.pageSize.getWidth();

  const tableY = drawKPISummary(doc, 'RESUMO OPERACIONAL', [
    `OS Totais: ${totalOS}`,
    `Fechadas: ${fechadas}`,
    `Em Aberto: ${abertas}`,
    `Corretivas: ${corretivas} (${totalOS > 0 ? ((corretivas / totalOS) * 100).toFixed(0) : 0}%)`,
    `Preventivas: ${preventivas} (${totalOS > 0 ? ((preventivas / totalOS) * 100).toFixed(0) : 0}%)`,
  ], startY, LEFT, pageWidth);
  const prioridadeCor: Record<string, [number,number,number]> = {
    URGENTE: [220, 38, 38], ALTA: [234, 88, 12], MEDIA: [202, 138, 4], BAIXA: [22, 163, 74],
  };

  autoTable(doc, {
    startY: tableY,
    head: [['Nº OS', 'TAG', 'Equipamento', 'Tipo', 'Prioridade', 'Status', 'Solicitante', 'Data Abertura', 'Custo (R$)']],
    body: filtered.map(os => [
      String(os.numero_os || '').padStart(6, '0'),
      os.tag || '',
      (os.equipamento || '').substring(0, 28),
      os.tipo || '',
      os.prioridade || '',
      os.status || '',
      (os.solicitante || '').substring(0, 20),
      os.data_solicitacao ? format(new Date(os.data_solicitacao), 'dd/MM/yyyy') : '',
      os.custo_real ? `R$ ${Number(os.custo_real).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', fontSize: 7, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      1: { cellWidth: 22, fontStyle: 'bold' },
      7: { halign: 'center' },
      8: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const cor = prioridadeCor[String(data.cell.raw)] || [80, 80, 80];
        data.cell.styles.textColor = cor;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: LEFT, right: LEFT },
  });

  // Linha de totais
  const finalY = (doc as any).lastAutoTable?.finalY || tableY + 10;
  const custoTotal = filtered.reduce((s, o) => s + (Number(o.custo_real) || 0), 0);
  if (custoTotal > 0) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text(
      `Custo Total: R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      pageWidth - LEFT, finalY + 6, { align: 'right' }
    );
  }

  addProfessionalFooter(doc, options);
  doc.save(`OS_Periodo_${options.dateFrom}_${options.dateTo}.pdf`);
}

export async function generateIndicadoresPDF(
  indicadores: any,
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, { ...options, dateFrom: '', dateTo: '' });
  const LEFT = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  type KPIRow = { label: string; value: string; unit: string; meta: string; status: 'ok' | 'alerta' | 'critico' };
  const rows: KPIRow[] = [
    {
      label: 'MTBF — Tempo Médio Entre Falhas',
      value: indicadores?.mtbf?.toFixed(1) ?? 'N/A',
      unit: 'horas',
      meta: '≥ 200h',
      status: indicadores?.mtbf >= 200 ? 'ok' : indicadores?.mtbf >= 100 ? 'alerta' : 'critico',
    },
    {
      label: 'MTTR — Tempo Médio de Reparo',
      value: indicadores?.mttr?.toFixed(1) ?? 'N/A',
      unit: 'horas',
      meta: '≤ 4h',
      status: indicadores?.mttr <= 4 ? 'ok' : indicadores?.mttr <= 8 ? 'alerta' : 'critico',
    },
    {
      label: 'Disponibilidade Operacional',
      value: indicadores?.disponibilidade?.toFixed(1) ?? 'N/A',
      unit: '%',
      meta: '≥ 95%',
      status: indicadores?.disponibilidade >= 95 ? 'ok' : indicadores?.disponibilidade >= 85 ? 'alerta' : 'critico',
    },
    {
      label: 'Backlog — Quantidade de OS pendentes',
      value: String(indicadores?.backlogQuantidade ?? 0),
      unit: 'OS',
      meta: '≤ 15 OS',
      status: (indicadores?.backlogQuantidade ?? 0) <= 15 ? 'ok' : (indicadores?.backlogQuantidade ?? 0) <= 30 ? 'alerta' : 'critico',
    },
    {
      label: 'Backlog — Carga horária pendente',
      value: String(indicadores?.backlogHoras ?? 0),
      unit: 'horas',
      meta: '≤ 80h',
      status: (indicadores?.backlogHoras ?? 0) <= 80 ? 'ok' : (indicadores?.backlogHoras ?? 0) <= 160 ? 'alerta' : 'critico',
    },
  ];

  const statusCor: Record<string, [number,number,number]> = {
    ok: [22, 163, 74], alerta: [202, 138, 4], critico: [220, 38, 38],
  };
  const statusLabel: Record<string, string> = { ok: '✓ Dentro da Meta', alerta: '⚠ Atenção', critico: '✗ Crítico' };

  autoTable(doc, {
    startY,
    head: [['Indicador', 'Valor', 'Unidade', 'Meta', 'Avaliação']],
    body: rows.map(r => [r.label, r.value, r.unit, r.meta, statusLabel[r.status]]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const row = rows[data.row.index];
        if (row) data.cell.styles.textColor = statusCor[row.status];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 1) {
        const row = rows[data.row.index];
        if (row) data.cell.styles.textColor = statusCor[row.status];
      }
    },
    margin: { left: LEFT, right: LEFT },
  });

  // Nota de referência
  const finalY = (doc as any).lastAutoTable?.finalY || startY + 60;
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100);
  doc.text('Referência: metas baseadas em benchmarks de manutenção industrial (NBR 5462 / JIPM).', LEFT, finalY + 7);

  // Síntese de disponibilidade
  if (indicadores?.disponibilidade != null) {
    const disp = Math.min(100, Math.max(0, Number(indicadores.disponibilidade)));
    const dispStatus = disp >= 95 ? 'DENTRO DA META' : disp >= 85 ? 'ATENÇÃO' : 'ABAIXO DA META';
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    doc.text(
      `Disponibilidade Operacional: ${disp.toFixed(1)}%  —  ${dispStatus}  (meta: ≥ 95%)`,
      LEFT, finalY + 14
    );
  }

  addProfessionalFooter(doc, options);
  doc.save(`Indicadores_KPI_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// GERADOR: Custos de Manutenção
// ─────────────────────────────────────────────────────────────
export async function generateCustosPDF(
  ordensServico: any[],
  execucoes: any[],
  indicadores: any,
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);
  const LEFT = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  const filtered = ordensServico.filter(o => {
    const d = o.data_solicitacao?.slice(0, 10);
    return d && d >= options.dateFrom && d <= options.dateTo;
  });

  const custoTotal = filtered.reduce((s, o) => s + (Number(o.custo_real) || 0), 0);
  const custoMO = execucoes.reduce((s, e) => s + (Number(e.custo_mao_obra) || 0), 0);
  const custoMat = execucoes.reduce((s, e) => s + (Number(e.custo_material) || 0), 0);
  const custoCorr = filtered.filter(o => o.tipo === 'CORRETIVA').reduce((s, o) => s + (Number(o.custo_real) || 0), 0);
  const custoPrev = filtered.filter(o => o.tipo === 'PREVENTIVA').reduce((s, o) => s + (Number(o.custo_real) || 0), 0);

  // Resumo financeiro
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const custoTableY = drawKPISummary(doc, 'RESUMO FINANCEIRO', [
    `Custo Total: ${fmt(custoTotal)}`,
    `Mão de Obra: ${fmt(custoMO)}`,
    `Materiais: ${fmt(custoMat)}`,
    `Corretiva: ${fmt(custoCorr)}`,
    `Preventiva: ${fmt(custoPrev)}`,
  ], startY, LEFT, pageWidth);

  // Tabela: ranking de equipamentos por custo
  const byTag: Record<string, { tag: string; nome: string; custo: number; qtd: number }> = {};
  filtered.forEach(o => {
    if (!o.tag) return;
    if (!byTag[o.tag]) byTag[o.tag] = { tag: o.tag, nome: o.equipamento || '', custo: 0, qtd: 0 };
    byTag[o.tag].custo += Number(o.custo_real) || 0;
    byTag[o.tag].qtd++;
  });
  const ranking = Object.values(byTag).sort((a, b) => b.custo - a.custo).slice(0, 15);

  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('Top 15 Equipamentos por Custo', LEFT, custoTableY + 3);

  autoTable(doc, {
    startY: custoTableY + 6,
    head: [['#', 'TAG', 'Equipamento', 'Qtd OS', 'Custo Total (R$)', '% do Total']],
    body: ranking.map((r, i) => [
      String(i + 1),
      r.tag,
      r.nome.substring(0, 35),
      String(r.qtd),
      r.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      custoTotal > 0 ? `${((r.custo / custoTotal) * 100).toFixed(1)}%` : '0%',
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247,249,252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 38, halign: 'right' },
      5: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: LEFT, right: LEFT },
  });

  // Tabela: custo por tipo
  const t1Y = (doc as any).lastAutoTable?.finalY || startY + 80;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('Custo por Tipo de Manutenção', LEFT, t1Y + 8);

  const tiposMap: Record<string, number> = {};
  filtered.forEach(o => {
    const t = o.tipo || 'SEM TIPO';
    tiposMap[t] = (tiposMap[t] || 0) + (Number(o.custo_real) || 0);
  });

  autoTable(doc, {
    startY: t1Y + 11,
    head: [['Tipo', 'Custo Total (R$)', '% do Total', 'OS']],
    body: Object.entries(tiposMap).sort((a,b) => b[1]-a[1]).map(([tipo, custo]) => [
      tipo,
      custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      custoTotal > 0 ? `${((custo / custoTotal) * 100).toFixed(1)}%` : '0%',
      String(filtered.filter(o => o.tipo === tipo).length),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    margin: { left: LEFT, right: LEFT },
  });

  addProfessionalFooter(doc, options);
  doc.save(`Custos_Manutencao_${options.dateFrom}_${options.dateTo}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// GERADOR: Backlog de OS
// ─────────────────────────────────────────────────────────────
export async function generateBacklogPDF(
  ordensServico: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);
  const LEFT = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  const backlog = ordensServico.filter(o =>
    o.status !== 'FECHADA' && o.status !== 'CANCELADA'
  );

  function getDias(o: any): number {
    if (!o.data_solicitacao) return 0;
    return Math.floor((now.getTime() - new Date(o.data_solicitacao).getTime()) / 86400000);
  }

  const faixas = [
    { label: '0 – 7 dias', min: 0, max: 7, cor: [22,163,74] as [number,number,number] },
    { label: '7 – 15 dias', min: 7, max: 15, cor: [202,138,4] as [number,number,number] },
    { label: '15 – 30 dias', min: 15, max: 30, cor: [234,88,12] as [number,number,number] },
    { label: '30+ dias (crítico)', min: 30, max: 9999, cor: [220,38,38] as [number,number,number] },
  ];

  // Resumo aging
  const agingItems = faixas.map(f => {
    const count = backlog.filter(o => { const d = getDias(o); return d >= f.min && d < f.max; }).length;
    return `${f.label}: ${count} OS`;
  });
  const backlogTableY = drawKPISummary(
    doc,
    `BACKLOG: ${backlog.length} ORDENS ABERTAS`,
    agingItems,
    startY, LEFT, pageWidth
  );

  autoTable(doc, {
    startY: backlogTableY,
    head: [['Nº OS', 'TAG', 'Equipamento', 'Tipo', 'Prioridade', 'Status', 'Data Abertura', 'Dias em Fila']],
    body: backlog
      .sort((a, b) => getDias(b) - getDias(a))
      .map(os => [
        String(os.numero_os || '').padStart(6, '0'),
        os.tag || '',
        (os.equipamento || '').substring(0, 28),
        os.tipo || '',
        os.prioridade || '',
        os.status || '',
        os.data_solicitacao ? format(new Date(os.data_solicitacao), 'dd/MM/yyyy') : '',
        String(getDias(os)),
      ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247,249,252] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const dias = Number(data.cell.raw);
        if (dias >= 30) data.cell.styles.textColor = [220,38,38];
        else if (dias >= 15) data.cell.styles.textColor = [234,88,12];
        else if (dias >= 7) data.cell.styles.textColor = [202,138,4];
        else data.cell.styles.textColor = [22,163,74];
      }
    },
    margin: { left: LEFT, right: LEFT },
  });

  addProfessionalFooter(doc, options);
  doc.save(`Backlog_OS_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// GERADOR: Aderência a Preventivas
// ─────────────────────────────────────────────────────────────
export async function generatePreventivasPDF(
  ordensServico: any[],
  aderenciaDetalhada: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);
  const LEFT = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  const prevs = ordensServico.filter(o => {
    const d = o.data_solicitacao?.slice(0, 10);
    return o.tipo === 'PREVENTIVA' && d && d >= options.dateFrom && d <= options.dateTo;
  });
  const prog = prevs.length;
  const exec = prevs.filter(o => o.status === 'FECHADA').length;
  const aderencia = prog > 0 ? (exec / prog) * 100 : 0;

  // Resumo aderência
  const aderStatus = aderencia >= 90 ? 'DENTRO DA META' : aderencia >= 70 ? 'ATENÇÃO' : 'ABAIXO DA META';
  const prevTableY = drawKPISummary(doc, 'ADERÊNCIA A PREVENTIVAS', [
    `Programadas: ${prog}`,
    `Executadas: ${exec}`,
    `Pendentes: ${prog - exec}`,
    `Aderência: ${aderencia.toFixed(1)}%  (meta: ≥ 90%)`,
    aderStatus,
  ], startY, LEFT, pageWidth);

  // Tabela por TAG
  const byTag: Record<string, { tag: string; nome: string; prog: number; exec: number }> = {};
  prevs.forEach(o => {
    if (!o.tag) return;
    if (!byTag[o.tag]) byTag[o.tag] = { tag: o.tag, nome: o.equipamento || '', prog: 0, exec: 0 };
    byTag[o.tag].prog++;
    if (o.status === 'FECHADA') byTag[o.tag].exec++;
  });

  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('Aderência por Equipamento', LEFT, prevTableY + 3);

  autoTable(doc, {
    startY: prevTableY + 6,
    head: [['TAG', 'Equipamento', 'Programadas', 'Executadas', 'Pendentes', '% Aderência']],
    body: Object.values(byTag).sort((a, b) => b.prog - a.prog).map(r => {
      const pct = r.prog > 0 ? ((r.exec / r.prog) * 100).toFixed(1) : '0.0';
      return [r.tag, r.nome.substring(0, 35), String(r.prog), String(r.exec), String(r.prog - r.exec), `${pct}%`];
    }),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247,249,252] },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const pct = parseFloat(String(data.cell.raw));
        if (pct >= 90) data.cell.styles.textColor = [22,163,74];
        else if (pct >= 70) data.cell.styles.textColor = [202,138,4];
        else data.cell.styles.textColor = [220,38,38];
      }
    },
    margin: { left: LEFT, right: LEFT },
  });

  addProfessionalFooter(doc, options);
  doc.save(`Aderencia_Preventivas_${options.dateFrom}_${options.dateTo}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// GERADOR: Desempenho por Equipamento
// ─────────────────────────────────────────────────────────────
export async function generateEquipamentosPDF(
  ordensServico: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);
  const LEFT = 14;

  const filtered = ordensServico.filter(o => {
    const d = o.data_solicitacao?.slice(0, 10);
    return d && d >= options.dateFrom && d <= options.dateTo;
  });

  const byTag: Record<string, { tag: string; nome: string; criticidade: string; total: number; fechadas: number; corretivas: number; custo: number; horasParada: number }> = {};
  filtered.forEach(o => {
    const k = o.tag || 'SEM TAG';
    if (!byTag[k]) byTag[k] = { tag: k, nome: o.equipamento || '', criticidade: o.criticidade || '', total: 0, fechadas: 0, corretivas: 0, custo: 0, horasParada: 0 };
    byTag[k].total++;
    if (o.status === 'FECHADA') byTag[k].fechadas++;
    if (o.tipo === 'CORRETIVA') byTag[k].corretivas++;
    byTag[k].custo += Number(o.custo_real) || 0;
    byTag[k].horasParada += Number(o.tempo_real) || Number(o.tempo_estimado) || 0;
  });

  autoTable(doc, {
    startY,
    head: [['TAG', 'Equipamento', 'Crit.', 'Total OS', 'Corretivas', 'Fechadas', 'Custo Total (R$)', 'H. Parada', 'Eficiência']],
    body: Object.values(byTag).sort((a, b) => b.total - a.total).map(r => {
      const efic = r.total > 0 ? ((r.fechadas / r.total) * 100).toFixed(0) : '0';
      const barra = '█'.repeat(Math.round(Number(efic) / 10)) + '░'.repeat(10 - Math.round(Number(efic) / 10));
      return [
        r.tag, r.nome.substring(0, 28), r.criticidade,
        String(r.total), String(r.corretivas), String(r.fechadas),
        r.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        r.horasParada.toFixed(1),
        `${efic}% ${barra}`,
      ];
    }),
    styles: { fontSize: 7, cellPadding: 2.5, font: 'helvetica' },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247,249,252] },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' },
      7: { cellWidth: 16, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const crit = String(data.cell.raw);
        if (crit === 'A') data.cell.styles.textColor = [220,38,38];
        else if (crit === 'B') data.cell.styles.textColor = [202,138,4];
        else data.cell.styles.textColor = [22,163,74];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: LEFT, right: LEFT },
  });

  addProfessionalFooter(doc, options);
  doc.save(`Desempenho_Equipamentos_${options.dateFrom}_${options.dateTo}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// GERADOR: Produtividade de Mecânicos
// ─────────────────────────────────────────────────────────────
export async function generateMecanicosPDF(
  execucoes: any[],
  mecanicosDesempenho: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);
  const LEFT = 14;

  const ranking = [...mecanicosDesempenho].sort((a, b) => (b.osExecutadas || 0) - (a.osExecutadas || 0));
  const totalOS = ranking.reduce((s, m) => s + (m.osExecutadas || 0), 0);
  const totalH = ranking.reduce((s, m) => s + (m.horasTrabalhadas || 0), 0);

  autoTable(doc, {
    startY,
    head: [['#', 'Mecânico / Técnico', 'OS Executadas', '% do Total', 'Horas Trab.', 'Eficiência', 'Avaliação']],
    body: ranking.map((m, i) => {
      const efic = m.eficiencia != null ? Number(m.eficiencia) : (totalH > 0 ? (m.horasTrabalhadas / totalH) * 100 : 0);
      const pctOS = totalOS > 0 ? ((m.osExecutadas / totalOS) * 100).toFixed(1) : '0.0';
      const barraEfic = '█'.repeat(Math.round(efic / 10)) + '░'.repeat(10 - Math.round(efic / 10));
      const avaliacao = efic >= 80 ? '⭐ Destaque' : efic >= 60 ? 'Regular' : 'Atenção';
      return [
        String(i + 1),
        m.nome || m.mecanico || '',
        String(m.osExecutadas || 0),
        `${pctOS}%`,
        `${(m.horasTrabalhadas || 0).toFixed(1)}h`,
        `${efic.toFixed(0)}% ${barraEfic}`,
        avaliacao,
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247,249,252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const v = String(data.cell.raw);
        if (v.includes('Destaque')) data.cell.styles.textColor = [22,163,74];
        else if (v.includes('Regular')) data.cell.styles.textColor = [202,138,4];
        else data.cell.styles.textColor = [220,38,38];
      }
    },
    margin: { left: LEFT, right: LEFT },
  });

  // Rodapé com totais
  const finalY = (doc as any).lastAutoTable?.finalY || startY + 60;
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text(
    `Total: ${ranking.length} técnicos | ${totalOS} OS executadas | ${totalH.toFixed(1)}h trabalhadas`,
    LEFT, finalY + 7
  );

  addProfessionalFooter(doc, options);
  doc.save(`Produtividade_Mecanicos_${options.dateFrom}_${options.dateTo}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// GERADOR: Resumo Executivo (layout tipo "dashboard impresso")
// ─────────────────────────────────────────────────────────────
export async function generateExecutivoPDF(
  indicadores: any,
  resumoExecutivo: any,
  kpis: any[],
  alertas: any[],
  ordensServico: any[],
  options: ReportOptions
) {
  const doc = new jsPDF();
  const startY = await addProfessionalHeader(doc, options);
  const LEFT = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  const now = new Date();
  const filtered = ordensServico.filter(o => {
    const d = o.data_solicitacao?.slice(0, 10);
    return d && d >= options.dateFrom && d <= options.dateTo;
  });
  const totalOS = filtered.length;
  const fechadas = filtered.filter(o => o.status === 'FECHADA').length;
  const abertas = filtered.filter(o => o.status !== 'FECHADA' && o.status !== 'CANCELADA').length;
  const custoTotal = filtered.reduce((s, o) => s + (Number(o.custo_real) || 0), 0);
  const corrPct = totalOS > 0 ? (filtered.filter(o => o.tipo === 'CORRETIVA').length / totalOS) * 100 : 0;

  // Resumo executivo compacto
  const dispStr = `${(indicadores?.disponibilidade || 0).toFixed(1)}%${indicadores?.disponibilidade >= 95 ? ' (OK)' : ' (!)' }`;
  const mtbfStr = `${(indicadores?.mtbf || 0).toFixed(1)}h${indicadores?.mtbf >= 200 ? ' (OK)' : ''}`;
  const execSummaryY = drawKPISummary(doc, 'RESUMO EXECUTIVO', [
    `OS: ${totalOS}  (${fechadas} fechadas / ${abertas} abertas)`,
    `Disponibilidade: ${dispStr}  meta ≥ 95%`,
    `MTBF: ${mtbfStr}  meta ≥ 200h`,
    `Custo: R$ ${(custoTotal / 1000).toFixed(1)}k  —  ${corrPct.toFixed(0)}% corretivas`,
  ], startY, LEFT, pageWidth);

  // Alertas (texto)
  const criticos = alertas.filter(a => a.tipo === 'CRITICO' || a.tipo === 'ALERTA');
  let afterGridY = execSummaryY;
  if (criticos.length > 0) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
    doc.text('ALERTAS:', LEFT, afterGridY + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 30, 30);
    criticos.slice(0, 5).forEach((a, idx) => {
      doc.text(`• ${a.titulo || a.mensagem || ''}`, LEFT + 22, afterGridY + 4 + idx * 5);
    });
    afterGridY += Math.min(criticos.length * 5 + 9, 35);
    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.3);
    doc.line(LEFT, afterGridY, pageWidth - LEFT, afterGridY);
    afterGridY += 4;
  }

  const kpiY = afterGridY;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('SEMÁFORO DE KPIs', LEFT, kpiY + 5);

  const kpiDisplay = kpis.slice(0, 8);
  autoTable(doc, {
    startY: kpiY + 8,
    head: [['KPI', 'Valor Atual', 'Meta', 'Status']],
    body: kpiDisplay.map(k => {
      const statusLabel = k.status === 'ok' ? '✓ OK' : k.status === 'alerta' ? '⚠ Alerta' : '✗ Crítico';
      return [k.nome || k.label || '', k.valor !== undefined ? String(k.valor) : '-', k.meta !== undefined ? String(k.meta) : '-', statusLabel];
    }),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BRAND, fontStyle: 'bold', textColor: [255,255,255] },
    alternateRowStyles: { fillColor: [247,249,252] },
    columnStyles: {
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const v = String(data.cell.raw);
        if (v.includes('OK')) data.cell.styles.textColor = [22,163,74];
        else if (v.includes('Alerta')) data.cell.styles.textColor = [202,138,4];
        else data.cell.styles.textColor = [220,38,38];
      }
    },
    margin: { left: LEFT, right: LEFT },
  });

  addProfessionalFooter(doc, options);
  doc.save(`Resumo_Executivo_${format(now, 'yyyyMMdd')}.pdf`);
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
