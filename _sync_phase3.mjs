// Sync Phase 3 changes to local clone
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const CLONE = process.argv[2] || 'C:\\Users\\Gustavo Pedrozo Pint\\pcm-estrategico-clone';

const files = [
  'src/components/ui/confirm-dialog.tsx',
  'src/App.tsx',
  'src/pages/Contratos.tsx',
  'src/pages/Lubrificacao.tsx',
  'src/pages/lubrificacao/EstoqueLubrificantes.tsx',
  'src/pages/lubrificacao/RotasLubrificacao.tsx',
  'src/components/admin/DispositivosMoveis.tsx',
  'src/components/owner/OwnerDispositivosTab.tsx',
  'src/components/preventiva/PlanoDetailPanel.tsx',
  'src/components/lubrificacao/AtividadesList.tsx',
  'src/pages/Fornecedores.tsx',
];

console.log('Syncing', files.length, 'files to', CLONE);
// This script is just a manifest - actual sync done via terminal
files.forEach(f => console.log(' -', f));
