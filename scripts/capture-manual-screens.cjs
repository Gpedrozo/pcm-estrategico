const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const base = 'http://127.0.0.1:4173';
  const shots = [['dashboard','/dashboard'],['solicitacoes','/solicitacoes'],['os_nova','/os/nova'],['os_fechar','/os/fechar'],['os_historico','/os/historico'],['programacao','/programacao'],['preventiva','/preventiva'],['preditiva','/preditiva'],['inspecoes','/inspecoes'],['equipamentos','/equipamentos'],['materiais','/materiais'],['documentos','/documentos'],['relatorios','/relatorios']];
  await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-email', process.env.OWNER_EMAIL || (() => { throw new Error('OWNER_EMAIL env var required') })());
  await page.fill('#login-password', process.env.OWNER_PASSWORD || (() => { throw new Error('OWNER_PASSWORD env var required') })());
  await Promise.all([
    page.waitForLoadState('networkidle').catch(()=>null),
    page.getByRole('button', { name: 'Entrar' }).click()
  ]);
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) throw new Error('Login não concluído.');
  for (const [name, route] of shots) {
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `docs/manual-images/${name}.png`, fullPage: true });
    console.log('capturado:' + name);
  }
  await browser.close();
})().catch(async (e) => { console.error(e.message || e); process.exit(1); });
