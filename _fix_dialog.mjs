import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/components/ajuda/InstaladorAPKDialog.tsx';
let content = readFileSync(filePath, 'utf8');

// Replace old APK download with EAS URL
content = content.replace(
  /const APK_URL = ['"]\/downloads\/PCM-Mecanico\.apk['"];/,
  "const EAS_APK_URL = 'https://expo.dev/accounts/gpedrozo/projects/mecanico-app/builds';"
);

// If it still uses APK_URL variable, rename to EAS_APK_URL
content = content.replace(/APK_URL/g, 'EAS_APK_URL');

// Replace old download handler if it points to direct download
content = content.replace(
  /const link = document\.createElement\('a'\);[\s\S]*?link\.click\(\);/,
  "window.open(EAS_APK_URL, '_blank');"
);

// Replace Download icon import with ExternalLink if not already there
if (!content.includes('ExternalLink')) {
  content = content.replace(
    "from 'lucide-react';",
    "ExternalLink } from 'lucide-react';"
  ).replace(
    / Download,/,
    ' Download, ExternalLink,'
  );
}

// Replace step 1 text
content = content.replace(
  /title="Transfira o APK para o celular">/,
  'title="Baixe o APK no celular">'
);
content = content.replace(
  /Envie o arquivo <strong>PCM-Mecanico\.apk<\/strong> para o celular via cabo USB,\s*\n\s*WhatsApp, Google Drive ou e-mail\./,
  'Abra o link de download diretamente no navegador do celular, ou envie\n                o arquivo via WhatsApp, Google Drive ou e-mail.'
);

// Replace "App Híbrido" with "App Nativo" if present
content = content.replace(/App Híbrido/g, 'App Nativo');
content = content.replace(/Capacitor/g, 'React Native');

// Fix download button to open external link
content = content.replace(
  /<Download className/g,
  '<ExternalLink className'
);

writeFileSync(filePath, content, 'utf8');
console.log('Dialog updated successfully');
