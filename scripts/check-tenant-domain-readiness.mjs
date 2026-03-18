#!/usr/bin/env node

import https from 'node:https';

const domain = process.argv[2];

if (!domain) {
  console.error('Uso: node scripts/check-tenant-domain-readiness.mjs <subdominio>');
  console.error('Exemplo: node scripts/check-tenant-domain-readiness.mjs acme.gppis.com.br');
  process.exit(1);
}

function headRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        statusCode: res.statusCode ?? 0,
        headers: res.headers,
      });
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const url = `https://${domain}/login`;

  try {
    const result = await headRequest(url);
    const statusCode = result.statusCode;
    const cfRay = String(result.headers['cf-ray'] ?? '');
    const server = String(result.headers.server ?? '');

    console.log('URL:', url);
    console.log('Status:', statusCode);
    console.log('Server:', server || '(sem header)');
    console.log('CF-RAY:', cfRay || '(sem header)');

    if (statusCode >= 200 && statusCode < 400) {
      console.log('OK: Subdomínio respondendo no edge.');
      process.exit(0);
    }

    if (statusCode === 523) {
      console.error('ERRO 523: Cloudflare não alcança a origem para esse subdomínio.');
      console.error('Ação: configurar wildcard/subdomínio no origin (cPanel/HostGator) e DNS correto no Cloudflare.');
      process.exit(2);
    }

    console.error('ERRO: Subdomínio não pronto para onboarding.');
    process.exit(3);
  } catch (error) {
    console.error('Falha de rede ao validar subdomínio:', String(error));
    process.exit(4);
  }
})();
