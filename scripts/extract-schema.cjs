const fs = require('fs');

const text = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');
const tablesSection = text.split('Tables:')[1].split('Views:')[0];
const tableBlocks = [...tablesSection.matchAll(/\n\s{6}([a-z0-9_]+):\s\{([\s\S]*?)\n\s{6}\}/g)];

let out = '# Database Tables (from types.ts)\n\n';

for (const match of tableBlocks) {
  const name = match[1];
  const block = match[2];
  const rowMatch = block.match(/Row:\s\{([\s\S]*?)\n\s{8}\}/);
  const row = rowMatch ? rowMatch[1] : '';
  const fields = [...row.matchAll(/\n\s{10}([a-z0-9_]+):\s([^\n]+)/g)]
    .map((m) => `- ${m[1]}: ${m[2].trim()}`);

  out += `## ${name}\n`;
  out += fields.length ? `${fields.join('\n')}\n\n` : '- (sem campos encontrados)\n\n';
}

fs.writeFileSync('schema_tables_detailed.md', out);
