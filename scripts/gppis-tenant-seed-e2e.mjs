import { chromium } from 'playwright';
import XLSX from 'xlsx';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TENANT_BASE_URL = (process.env.TENANT_BASE_URL || 'https://gppis.com.br').replace(/\/$/, '');
const TENANT_EMAIL = process.env.TENANT_EMAIL || '';
const TENANT_PASSWORD = process.env.TENANT_PASSWORD || '';
const HEADLESS = String(process.env.TENANT_E2E_HEADLESS || 'true').toLowerCase() !== 'false';
const TAG_PREFIX = process.env.TENANT_TAG_PREFIX || 'GPPIS';

if (!TENANT_EMAIL || !TENANT_PASSWORD) {
  throw new Error('Missing TENANT_EMAIL or TENANT_PASSWORD environment variables.');
}

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: TENANT_BASE_URL,
  ok: false,
  steps: [],
  failures: [],
};

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function pushStep(name, status, details = {}) {
  report.steps.push({ at: new Date().toISOString(), name, status, details });
}

function buildTechnicalWorkbook(pathname) {
  const headers = [
    'NIVEL',
    'COMPONENTE',
    'ESPECIFICAÇÃO TÉCNICA',
    'MATERIAL',
    'DIMENSÃO / MODELO',
    'NORMA / FABRICANTE',
    'QTD',
    'UNIDADE',
    'TAG_ATIVO',
    'OBSERVAÇÕES',
  ];

  const tags = [
    `${TAG_PREFIX}-CMP-001`,
    `${TAG_PREFIX}-CMP-002`,
    `${TAG_PREFIX}-RED-001`,
    `${TAG_PREFIX}-ELV-001`,
    `${TAG_PREFIX}-BOM-001`,
    `${TAG_PREFIX}-FAN-001`,
  ];

  const rows = [];
  for (const tag of tags) {
    rows.push(['1', 'Conjunto Motriz', 'Conjunto principal de acionamento', 'Aço', 'MTR-75', 'WEG', '1', 'un', tag, 'Raiz']);
    rows.push(['1.1', 'Motor Elétrico', 'Motor trifásico', 'Aço', '75kW/4P', 'WEG', '1', 'un', tag, '']);
    rows.push(['1.1.1', 'Rolamento DE', 'Rolamento lado acionamento', 'Aço', '6316', 'SKF', '1', 'un', tag, 'Componente crítico recorrente']);
    rows.push(['1.1.2', 'Rolamento NDE', 'Rolamento lado oposto', 'Aço', '6314', 'SKF', '1', 'un', tag, '']);
    rows.push(['1.2', 'Acoplamento', 'Acoplamento elástico', 'Aço', 'ACP-210', 'Falk', '1', 'un', tag, '']);
    rows.push(['2', 'Sistema de Lubrificação', 'Linha de lubrificação central', 'Aço', 'LIN-01', 'Lincoln', '1', 'un', tag, '']);
    rows.push(['2.1', 'Ponto Mancal DE', 'Ponto de graxa mancal DE', 'Aço', 'NIPLE M8', 'Lincoln', '1', 'un', tag, 'Ponto inspeção']);
    rows.push(['2.2', 'Ponto Mancal NDE', 'Ponto de graxa mancal NDE', 'Aço', 'NIPLE M8', 'Lincoln', '1', 'un', tag, 'Ponto inspeção']);
    rows.push(['3', 'Instrumentação', 'Sensores de monitoramento', 'Eletrônico', 'KIT-PRED', 'Fluke', '1', 'un', tag, '']);
    rows.push(['3.1', 'Sensor Vibração', 'Acelerômetro piezoelétrico', 'Eletrônico', 'ACC-100', 'Fluke', '1', 'un', tag, '']);
    rows.push(['3.2', 'Sensor Temperatura', 'PT100 classe A', 'Eletrônico', 'PT100', 'Siemens', '1', 'un', tag, '']);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 22) }));
  XLSX.utils.book_append_sheet(wb, ws, 'ComponentesTecnicos');
  XLSX.writeFile(wb, pathname);

  return tags;
}

async function clickFirstVisible(page, selectors, timeout = 8000) {
  let lastError = null;
  for (const selector of selectors) {
    try {
      const locator = typeof selector === 'string' ? page.locator(selector).first() : selector;
      await locator.click({ timeout });
      return true;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Could not click target: ${String(lastError?.message || lastError || 'unknown')}`);
}

async function openSelectAndChoose(page, triggerLocator, optionText) {
  await triggerLocator.click({ timeout: 8000 });
  const option = page.getByRole('option', { name: optionText }).first();
  await option.click({ timeout: 8000 });
}

async function login(page) {
  await page.goto(`${TENANT_BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#login-email', TENANT_EMAIL);
  await page.fill('#login-password', TENANT_PASSWORD);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => null),
    page.getByRole('button', { name: 'Entrar' }).click(),
  ]);

  const started = Date.now();
  while (Date.now() - started < 45000) {
    const url = page.url();
    if (url.includes('/dashboard')) {
      pushStep('login', 'ok', { url });
      return;
    }
    if (url.includes('/change-password')) {
      throw new Error('Usuário caiu em troca obrigatória de senha; fluxo automatizado não pode prosseguir.');
    }
    await sleep(500);
  }

  throw new Error(`Login não concluído. URL final: ${page.url()}`);
}

async function createHierarchy(page) {
  await page.goto(`${TENANT_BASE_URL}/hierarquia`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Planta
  await page.getByRole('button', { name: /Novo Planta/i }).click({ timeout: 10000 });
  await page.locator('#codigo').fill('PL-GPPIS-01');
  await page.locator('#nome').fill('Planta GPPIS Principal');
  await page.locator('#endereco').fill('Distrito Industrial - Unidade Principal');
  await page.locator('#responsavel').fill('Eng. Manutenção GPPIS');
  await page.getByRole('button', { name: 'Criar' }).click();
  await sleep(1200);

  // Área
  await page.getByRole('tab', { name: /Áreas/i }).click({ timeout: 8000 });
  await page.getByRole('button', { name: /Novo Área/i }).click({ timeout: 8000 });
  await openSelectAndChoose(page, page.getByLabel('Planta *').locator('..').getByRole('combobox').first(), 'PL-GPPIS-01 - Planta GPPIS Principal');
  await page.locator('#codigo').fill('AR-GPPIS-UTIL');
  await page.locator('#nome').fill('Área Utilidades');
  await page.locator('#descricao').fill('Compressores, ventilação e bombeamento de utilidades.');
  await page.getByRole('button', { name: 'Criar' }).click();
  await sleep(1200);

  // Sistemas
  await page.getByRole('tab', { name: /Sistemas/i }).click({ timeout: 8000 });

  await page.getByRole('button', { name: /Novo Sistema/i }).click({ timeout: 8000 });
  await openSelectAndChoose(page, page.getByLabel('Área *').locator('..').getByRole('combobox').first(), 'AR-GPPIS-UTIL - Área Utilidades');
  await page.locator('#codigo').fill('SI-GPPIS-COMP');
  await page.locator('#nome').fill('Sistema de Compressores');
  await page.locator('#descricao').fill('Sistema de geração de ar comprimido');
  await page.locator('#funcao_principal').fill('Garantir ar comprimido para linhas críticas.');
  await page.getByRole('button', { name: 'Criar' }).click();
  await sleep(1200);

  await page.getByRole('button', { name: /Novo Sistema/i }).click({ timeout: 8000 });
  await openSelectAndChoose(page, page.getByLabel('Área *').locator('..').getByRole('combobox').first(), 'AR-GPPIS-UTIL - Área Utilidades');
  await page.locator('#codigo').fill('SI-GPPIS-BOMB');
  await page.locator('#nome').fill('Sistema de Bombeamento');
  await page.locator('#descricao').fill('Sistema de circulação e bombeamento de fluidos.');
  await page.locator('#funcao_principal').fill('Assegurar fluxo e pressão operacionais.');
  await page.getByRole('button', { name: 'Criar' }).click();
  await sleep(1200);

  pushStep('hierarquia', 'ok');
}

async function importEquipments(page, technicalFile) {
  await page.goto(`${TENANT_BASE_URL}/equipamentos`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: /Importar \(Padrão\/Técnico\)/i }).click({ timeout: 10000 });
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(technicalFile);
  await sleep(4000);
  pushStep('equipamentos_import', 'ok', { technicalFile });
}

async function createPreventivePlan(page, firstTag) {
  await page.goto(`${TENANT_BASE_URL}/preventiva`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: /Novo Plano/i }).click({ timeout: 10000 });

  await page.getByLabel('Nome do Plano *').fill(`Plano Preventivo IA ${firstTag}`);
  await page.getByLabel('Descrição').fill('Plano cadastrado para teste de IA com foco em recorrência de rolamentos e lubrificação.');

  const gatilhoCombobox = page.getByLabel('Tipo Gatilho').locator('..').getByRole('combobox').first();
  await openSelectAndChoose(page, gatilhoCombobox, 'Tempo');

  await page.getByLabel('Frequência (dias)').fill('21');
  await page.getByLabel('Tempo Est. (min)').fill('120');
  await page.getByLabel('Instruções').fill('Inspecionar vibração, reaperto, condição do lubrificante e alinhamento.');
  await page.getByRole('button', { name: 'Criar Plano' }).click({ timeout: 10000 });
  await sleep(1500);

  pushStep('preventiva_create_plan', 'ok');
}

async function createLubricationPlan(page, firstTag) {
  await page.goto(`${TENANT_BASE_URL}/lubrificacao`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: /Novo Plano/i }).click({ timeout: 10000 });

  await page.getByLabel('Nome do Plano *').fill(`Plano Lubrificação IA ${firstTag}`);
  await page.getByLabel('Lubrificante Padrão').fill('Graxa EP2');
  await page.getByLabel('Responsável').fill('Equipe Lubrificação GPPIS');
  await page.getByLabel('Escopo / Instruções Gerais').fill('Executar lubrificação orientada por condição e checklist de pontos críticos.');
  await page.getByLabel('Periodicidade').fill('14');

  await page.getByRole('button', { name: /Adicionar Ponto/i }).click();
  const descricaoPonto = page.getByPlaceholder('Descrição do componente / ponto *').first();
  await descricaoPonto.fill('Mancal DE - Motor principal');
  await page.getByPlaceholder('Tempo (min)').first().fill('20');
  await page.getByPlaceholder('Quantidade').first().fill('120g');
  await page.getByPlaceholder('Método / Ferramenta').first().fill('Pistola de graxa manual');
  await page.getByPlaceholder('Instruções / Recomendações').first().fill('Aplicar lentamente e monitorar purga de contaminantes.');

  await page.getByRole('button', { name: /Criar Plano/i }).last().click({ timeout: 10000 });
  await sleep(1500);

  pushStep('lubrificacao_create_plan', 'ok');
}

async function createInspectionRoute(page, firstTag) {
  await page.goto(`${TENANT_BASE_URL}/inspecoes`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: /Nova Inspeção/i }).click({ timeout: 10000 });

  await page.getByLabel('Nome da Rota *').fill(`Rota IA ${firstTag}`);

  const freqCombo = page.getByLabel('Frequência').locator('..').getByRole('combobox').first();
  await openSelectAndChoose(page, freqCombo, 'Semanal');

  await page.getByLabel('Objetivo da Rota').fill('Detectar início de falha por vibração e aquecimento antes de parada não programada.');
  await page.getByLabel('Inspetor').fill('Inspetor IA GPPIS');
  await page.getByLabel('Descrição').fill('Rota criada em massa de homologação para acionar recomendações da IA.');

  await page.getByRole('button', { name: /Iniciar Inspeção/i }).click({ timeout: 10000 });
  await sleep(1500);

  pushStep('inspecao_create_route', 'ok');
}

async function createPredictiveMeasurements(page, firstTag) {
  await page.goto(`${TENANT_BASE_URL}/preditiva`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const values = [6.5, 8.2, 11.3];
  for (let i = 0; i < values.length; i += 1) {
    await page.getByRole('button', { name: /Nova Medição/i }).click({ timeout: 10000 });

    const tagCombo = page.getByLabel('TAG do Equipamento *').locator('..').getByRole('combobox').first();
    await tagCombo.click();
    await page.getByRole('option', { name: new RegExp(`^${firstTag}\\s-`) }).first().click({ timeout: 10000 });

    await page.getByLabel('Valor Medido *').fill(String(values[i]));
    await page.getByLabel('Limite de Alerta').fill('7.5');
    await page.getByLabel('Limite Crítico').fill('10.0');
    await page.getByLabel('Observações').fill(`Medição sequencial ${i + 1} para tendência de vibração em rolamento.`);

    await page.getByRole('button', { name: /Registrar Medição/i }).click({ timeout: 10000 });

    const openOSButton = page.getByRole('button', { name: /Abrir O.S pré-preenchida/i }).first();
    if (await openOSButton.isVisible().catch(() => false)) {
      await openOSButton.click({ timeout: 8000 });
    }

    await sleep(1000);
  }

  pushStep('preditiva_create_measurements', 'ok', { measurements: values.length });
}

async function createCorrectiveOrders(page, tags) {
  await page.goto(`${TENANT_BASE_URL}/os/nova`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const selected = tags.slice(0, 3);
  for (let i = 0; i < 6; i += 1) {
    const tag = selected[i % selected.length];

    const tagComboButton = page.getByRole('button', { name: /Selecione uma TAG|Digite ou selecione a TAG/i }).first();
    await tagComboButton.click({ timeout: 10000 });
    await page.getByPlaceholder('Digite a TAG... (ex: EL-)').fill(tag);
    await page.getByRole('option', { name: new RegExp(`^${tag}$`) }).first().click({ timeout: 10000 }).catch(async () => {
      await page.getByRole('option', { name: new RegExp(`^${tag}`) }).first().click({ timeout: 10000 });
    });

    const tipoCombo = page.getByLabel('Tipo de Manutenção *').locator('..').getByRole('combobox').first();
    await openSelectAndChoose(page, tipoCombo, 'Corretiva');

    const prioridadeCombo = page.getByLabel('Prioridade').locator('..').getByRole('combobox').first();
    await openSelectAndChoose(page, prioridadeCombo, i % 2 === 0 ? 'ALTA' : 'URGENTE');

    await page.getByLabel('Solicitante *').fill('Operação GPPIS');
    await page.getByLabel('Problema Apresentado *').fill('Aumento de vibração com aquecimento no conjunto de rolamentos. Recorrência observada nas últimas semanas.');
    await page.getByLabel('Tempo Estimado (min)').fill('180');

    await page.getByRole('button', { name: /Salvar O.S/i }).click({ timeout: 12000 });

    const noPrint = page.getByRole('button', { name: /Não, obrigado/i }).first();
    if (await noPrint.isVisible().catch(() => false)) {
      await noPrint.click({ timeout: 5000 });
    }

    await sleep(1000);
  }

  pushStep('os_create_corretivas', 'ok', { count: 6 });
}

async function verifyRoutes(page) {
  const routes = [
    '/dashboard',
    '/hierarquia',
    '/equipamentos',
    '/preventiva',
    '/lubrificacao',
    '/inspecoes',
    '/preditiva',
    '/os/historico',
    '/rca',
  ];

  const checks = [];
  for (const route of routes) {
    await page.goto(`${TENANT_BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const failed = page.url().includes('/login');
    checks.push({ route, ok: !failed, url: page.url() });
  }

  const failedRoutes = checks.filter((c) => !c.ok);
  if (failedRoutes.length > 0) {
    throw new Error(`Falha em ${failedRoutes.length} rota(s): ${failedRoutes.map((f) => f.route).join(', ')}`);
  }

  pushStep('routes_verify', 'ok', { total: routes.length });
}

async function main() {
  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true });
  mkdirSync(resolve(process.cwd(), 'tmp'), { recursive: true });

  const technicalFile = resolve(process.cwd(), 'tmp', `gppis-tecnico-${Date.now()}.xlsx`);
  const tags = buildTechnicalWorkbook(technicalFile);

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    await login(page);
    await createHierarchy(page);
    await importEquipments(page, technicalFile);
    await createCorrectiveOrders(page, tags);
    await createPreventivePlan(page, tags[0]);
    await createLubricationPlan(page, tags[0]);
    await createInspectionRoute(page, tags[0]);
    await createPredictiveMeasurements(page, tags[0]);
    await verifyRoutes(page);

    report.ok = true;
  } catch (error) {
    const message = String(error?.message || error || 'unknown_error');
    report.failures.push({ at: new Date().toISOString(), message });
    pushStep('fatal', 'error', { message });

    try {
      const shot = resolve(process.cwd(), 'reports', `gppis-seed-failure-${Date.now()}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      report.failureScreenshot = shot;
    } catch {
      // ignore screenshot failure
    }

    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    const out = resolve(process.cwd(), 'reports', `gppis-seed-e2e-report-${Date.now()}.json`);
    writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[GPPIS_SEED_REPORT] ${out}`);

    if (existsSync(technicalFile)) {
      // keep file for traceability
      report.technicalWorkbook = technicalFile;
    }

    await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }
}

main().catch((error) => {
  console.error('[GPPIS_SEED_E2E_FAIL]', error?.message || error);
  process.exit(1);
});
