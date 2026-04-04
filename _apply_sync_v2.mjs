import fs from 'fs';
import path from 'path';

const base = 'C:/Users/Gustavo Pedrozo Pint/pcm-estrategico-clone';

// Read current files and apply line-by-line patches

// ─── syncEngine.ts ───
{
  const file = path.join(base, 'mecanico-app/src/lib/syncEngine.ts');
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const out = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // 1. Add saveDeviceConfig to imports
    if (line.trim() === 'getDeviceConfig,' && lines[i+1]?.includes("} from './database'")) {
      out.push(line);
      out.push('  saveDeviceConfig,');
      i++;
      out.push(lines[i]); // } from './database';
      i++;
      continue;
    }
    
    // 2. Replace pullData signature + add incremental logic
    if (line.includes('export async function pullData(empresaId: string)')) {
      out.push('export async function pullData(empresaId: string, forceFullRefresh = false): Promise<void> {');
      i++;
      // Skip "if (!empresaId) return;"
      out.push(lines[i]); i++;
      // Skip blank line
      out.push(lines[i]); i++;
      // Insert incremental sync logic before first pull
      out.push('  // Incremental sync: use last_sync_timestamp to only fetch changed records');
      out.push('  // forceFullRefresh = true when user manually pulls to refresh');
      out.push("  const lastSync = forceFullRefresh ? null : await getDeviceConfig('last_sync_timestamp');");
      out.push("  const sinceTs = lastSync || '1970-01-01T00:00:00Z';");
      out.push('');
      out.push('  // Helper: build query with optional updated_at filter');
      out.push('  function withTimestamp(query: any) {');
      out.push('    if (lastSync) {');
      out.push("      return query.gte('updated_at', sinceTs);");
      out.push('    }');
      out.push('    return query;');
      out.push('  }');
      out.push('');
      continue;
    }
    
    // 3. Wrap OS pull with withTimestamp and increase limit
    if (line.includes("const { data: osList } = await supabase")) {
      out.push("  const { data: osList } = await withTimestamp(");
      out.push("    supabase");
      i++; // skip .from line
      out.push(lines[i]); i++; // .from
      out.push(lines[i]); i++; // .select
      out.push(lines[i]); i++; // .eq
      out.push(lines[i]); i++; // .order
      // Skip old .limit line
      if (lines[i]?.includes('.limit(')) { i++; }
      out.push("  ).limit(1000);");
      continue;
    }
    
    // 4. Wrap execucoes pull with withTimestamp
    if (line.includes("const { data: execList } = await supabase")) {
      out.push("  const { data: execList } = await withTimestamp(");
      out.push("    supabase");
      i++; // .from
      out.push(lines[i]); i++;
      out.push(lines[i]); i++; // .select
      out.push(lines[i]); i++; // .eq
      out.push(lines[i]); i++; // .order
      if (lines[i]?.includes('.limit(')) { i++; }
      out.push("  ).limit(1000);");
      continue;
    }
    
    // 5. Wrap equipamentos pull with withTimestamp
    if (line.includes("const { data: eqList } = await supabase")) {
      out.push("  const { data: eqList } = await withTimestamp(");
      out.push("    supabase");
      i++; // .from
      out.push(lines[i]); i++;
      out.push(lines[i]); i++; // .select
      out.push(lines[i]); i++; // .eq
      if (lines[i]?.includes('.limit(')) { i++; }
      out.push("  ).limit(1000);");
      continue;
    }
    
    // 6. Increase mecanicos limit
    if (line.includes(".eq('ativo', true)") && lines[i+1]?.includes('.limit(200)')) {
      out.push(line);
      i++;
      out.push("    .limit(500);");
      i++;
      continue;
    }
    
    // 7. Wrap materiais pull with withTimestamp
    if (line.includes("const { data: matList } = await supabase")) {
      // Skip the comment line before if present
      out.push("  const { data: matList } = await withTimestamp(");
      out.push("    supabase");
      i++; // .from
      out.push(lines[i]); i++;
      out.push(lines[i]); i++; // .select
      out.push(lines[i]); i++; // .eq
      if (lines[i]?.includes('.limit(')) { i++; }
      out.push("  ).limit(1000);");
      continue;
    }
    
    // 8. Wrap documentos pull with withTimestamp
    if (line.includes("const { data: docList } = await supabase")) {
      out.push("  const { data: docList } = await withTimestamp(");
      out.push("    supabase");
      i++; // .from
      out.push(lines[i]); i++;
      out.push(lines[i]); i++; // .select
      out.push(lines[i]); i++; // .eq
      if (lines[i]?.includes('.limit(')) { i++; }
      out.push("  ).limit(500);");
      continue;
    }
    
    // 9. Wrap paradas pull with withTimestamp  
    if (line.includes("const { data: paradaList } = await supabase")) {
      out.push("  const { data: paradaList } = await withTimestamp(");
      out.push("    supabase");
      i++; // .from
      out.push(lines[i]); i++;
      out.push(lines[i]); i++; // .select
      out.push(lines[i]); i++; // .eq
      out.push(lines[i]); i++; // .order
      if (lines[i]?.includes('.limit(')) { i++; }
      out.push("  ).limit(500);");
      continue;
    }
    
    // 10. Wrap requisicoes pull with withTimestamp
    if (line.includes("const { data: reqList } = await supabase")) {
      out.push("  const { data: reqList } = await withTimestamp(");
      out.push("    supabase");
      i++; // .from
      out.push(lines[i]); i++;
      out.push(lines[i]); i++; // .select
      out.push(lines[i]); i++; // .eq
      out.push(lines[i]); i++; // .order
      if (lines[i]?.includes('.limit(')) { i++; }
      out.push("  ).limit(500);");
      continue;
    }
    
    // 11. After last upsertRequisicao block, add saveDeviceConfig
    if (line.includes("await upsertRequisicao") && lines[i+1]?.trim() === '}' && lines[i+2]?.trim() === '}') {
      out.push(line);
      i++; out.push(lines[i]); // }
      i++; out.push(lines[i]); // }
      i++;
      out.push('');
      out.push('  // Save sync timestamp for next incremental pull');
      out.push("  await saveDeviceConfig('last_sync_timestamp', new Date().toISOString());");
      continue;
    }
    
    // 12. Add log for pulled OS
    if (line.includes('await upsertOrdemServico(os)') && lines[i+1]?.trim() === '}' && lines[i+2]?.trim() === '}') {
      out.push(line);
      i++; out.push(lines[i]); // }
      i++;
      out.push("    console.log(`[sync] pulled ${osList.length} OS${lastSync ? ' (incremental)' : ' (full)'}`);");
      out.push(lines[i]); // }
      i++;
      continue;
    }
    
    // 13. Replace runSyncCycle signature
    if (line.includes('export async function runSyncCycle()')) {
      out.push('export async function runSyncCycle(forceFullRefresh = false): Promise<{ pushed: number; pulled: boolean }> {');
      i++;
      continue;
    }
    
    // 14. Pass forceFullRefresh to pullData
    if (line.includes('await pullData(empresaId)')) {
      out.push(line.replace('await pullData(empresaId)', 'await pullData(empresaId, forceFullRefresh)'));
      i++;
      continue;
    }
    
    // 15. Skip old "Supabase column" comment lines
    if (line.includes("Supabase column is 'nome'") || line.includes("Supabase column is 'titulo'")) {
      i++;
      continue;
    }
    
    // 16. Replace comment "Pull Paradas (para exibir...)" 
    if (line.includes('Pull Paradas (para exibir')) {
      out.push('  // Pull Paradas');
      i++;
      continue;
    }
    
    // 17. Replace comment "Pull Requisicoes (para ver status)"
    if (line.includes('Pull Requisicoes (para ver status)')) {
      out.push('  // Pull Requisicoes');
      i++;
      continue;
    }
    
    out.push(line);
    i++;
  }
  
  fs.writeFileSync(file, out.join('\n'), 'utf-8');
  console.log('PATCHED syncEngine.ts (' + out.length + ' lines)');
}

// ─── HistoryScreen.tsx ───
{
  const file = path.join(base, 'mecanico-app/src/screens/HistoryScreen.tsx');
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const out = [];
  
  for (let i = 0; i < lines.length; i++) {
    // Add import after database import
    if (lines[i].includes("from '../lib/database'")) {
      out.push(lines[i]);
      out.push("import { runSyncCycle } from '../lib/syncEngine';");
      continue;
    }
    
    // Replace onRefresh
    if (lines[i].includes('const onRefresh = async') && lines[i+1]?.includes('setRefreshing(true)') && lines[i+2]?.includes('await load()') && lines[i+3]?.includes('setRefreshing(false)')) {
      out.push('  const onRefresh = async () => {');
      out.push('    setRefreshing(true);');
      out.push('    try {');
      out.push('      await runSyncCycle(true);');
      out.push('      await load();');
      out.push('    } finally {');
      out.push('      setRefreshing(false);');
      out.push('    }');
      i += 3; // skip old lines
      continue;
    }
    
    out.push(lines[i]);
  }
  
  fs.writeFileSync(file, out.join('\n'), 'utf-8');
  console.log('PATCHED HistoryScreen.tsx');
}

// ─── OSDetailScreen.tsx ───
{
  const file = path.join(base, 'mecanico-app/src/screens/OSDetailScreen.tsx');
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const out = [];
  
  for (let i = 0; i < lines.length; i++) {
    // Add import after database import
    if (lines[i].includes("} from '../lib/database'") && !lines[i+1]?.includes('runSyncCycle')) {
      out.push(lines[i]);
      out.push("import { runSyncCycle } from '../lib/syncEngine';");
      continue;
    }
    
    // Replace onRefresh
    if (lines[i].includes('const onRefresh = async') && lines[i+1]?.includes('setRefreshing(true)') && lines[i+2]?.includes('await load()') && lines[i+3]?.includes('setRefreshing(false)')) {
      out.push('  const onRefresh = async () => {');
      out.push('    setRefreshing(true);');
      out.push('    try {');
      out.push('      await runSyncCycle(true);');
      out.push('      await load();');
      out.push('    } finally {');
      out.push('      setRefreshing(false);');
      out.push('    }');
      i += 3;
      continue;
    }
    
    out.push(lines[i]);
  }
  
  fs.writeFileSync(file, out.join('\n'), 'utf-8');
  console.log('PATCHED OSDetailScreen.tsx');
}

// ─── HomeScreen.tsx ───
{
  const file = path.join(base, 'mecanico-app/src/screens/HomeScreen.tsx');
  let src = fs.readFileSync(file, 'utf-8');
  
  src = src.replace(
    'await runSyncCycle();',
    'await runSyncCycle(true);'
  );
  
  fs.writeFileSync(file, src, 'utf-8');
  console.log('PATCHED HomeScreen.tsx');
}

// ─── MecanicoSelectScreen.tsx – password validation via edge function ───
{
  const file = path.join(base, 'mecanico-app/src/screens/MecanicoSelectScreen.tsx');
  let src = fs.readFileSync(file, 'utf-8');
  
  // Add SUPABASE_URL, SUPABASE_ANON_KEY import if not present
  if (!src.includes('SUPABASE_URL')) {
    src = src.replace(
      "import { supabase } from '../lib/supabase';",
      "import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';"
    );
  }
  
  // Replace supabase.rpc password validation with edge function call
  if (src.includes("supabase.rpc('validar_senha_mecanico'")) {
    // Find and replace the try block 
    const oldTry = `    try {
      // Valida via RPC (SECURITY DEFINER)
      const { data, error } = await supabase.rpc('validar_senha_mecanico', {
        p_mecanico_id: selectedMec.id,
        p_senha: senhaTrimmed,
      });

      if (error) {
        console.warn('[MecanicoSelect] RPC validar_senha error:', error.message);
        setSenhaError('Erro ao validar. Tente novamente.');
        setValidating(false);
        return;
      }

      // RPC retorna { valid: boolean }
      if (data?.valid === true || data === true) {
        // Senha correta \u2014 prossegue
        await selectMecanico(selectedMec.id, selectedMec.nome);
      } else {
        setSenhaError('Senha incorreta');
        setValidating(false);
      }
    } catch (err: any) {
      console.warn('[MecanicoSelect] erro valida\u00e7\u00e3o:', err);
      setSenhaError('Erro de conex\u00e3o. Verifique sua internet.');
      setValidating(false);
    }`;

    const newTry = `    try {
      // Usa edge function que funciona com service_role internamente
      const response = await fetch(
        \`\${SUPABASE_URL}/functions/v1/mecanico-device-auth\`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: 'validar_senha',
            mecanico_id: selectedMec.id,
            senha: senhaTrimmed,
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        console.warn('[MecanicoSelect] Valida\u00e7\u00e3o error:', result.error);
        setSenhaError(result.error || 'Erro ao validar. Tente novamente.');
        setValidating(false);
        return;
      }

      if (result.valid === true) {
        // Senha correta \u2014 prossegue
        await selectMecanico(selectedMec.id, selectedMec.nome);
      } else {
        setSenhaError('Senha incorreta');
        setValidating(false);
      }
    } catch (err: any) {
      console.warn('[MecanicoSelect] erro valida\u00e7\u00e3o:', err);
      setSenhaError('Erro de conex\u00e3o. Verifique sua internet.');
      setValidating(false);
    }`;

    if (src.includes(oldTry)) {
      src = src.replace(oldTry, newTry);
      console.log('  -> replaced RPC with edge function');
    } else {
      console.log('  -> WARNING: could not find exact RPC block, trying line-by-line...');
      // Line by line approach
      const lines = src.split('\n');
      const out = [];
      let skip = false;
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].includes("supabase.rpc('validar_senha_mecanico'")) {
          // Go back to find "try {"
          while (out.length > 0 && !out[out.length-1].includes('try {')) {
            out.pop();
          }
          if (out.length > 0) out.pop(); // remove try {
          
          // Add new try block
          newTry.split('\n').forEach(l => out.push(l));
          
          // Skip until matching catch/finally end
          let braceCount = 0;
          let foundCatch = false;
          while (j < lines.length) {
            if (lines[j].includes('} catch')) foundCatch = true;
            if (foundCatch) {
              const opens = (lines[j].match(/{/g) || []).length;
              const closes = (lines[j].match(/}/g) || []).length;
              braceCount += opens - closes;
              if (braceCount <= 0 && foundCatch && lines[j].trim() === '}') {
                j++;
                break;
              }
            }
            j++;
          }
          j--; // will be incremented by for loop
          continue;
        }
        if (!skip) out.push(lines[j]);
      }
      src = out.join('\n');
    }
  }
  
  // Replace handleRefresh to use forceFullRefresh
  if (src.includes('await runSyncCycle();')) {
    src = src.replace('await runSyncCycle();', 'await runSyncCycle(true);');
  }
  
  // Improve handleRefresh: sync first, then fetch
  src = src.replace(
    `      // For\u00e7a busca do Supabase (sempre atualizado)
      const freshList = await fetchFromSupabase();`,
    `      // For\u00e7a sync completo (full refresh) + busca fresca
      await runSyncCycle(true);
      const freshList = await fetchFromSupabase();`
  );
  
  fs.writeFileSync(file, src, 'utf-8');
  console.log('PATCHED MecanicoSelectScreen.tsx');
}

// ─── Edge function patch ───
{
  const file = path.join(base, 'supabase/functions/mecanico-device-auth/index.ts');
  const src = fs.readFileSync(file, 'utf-8');
  if (!src.includes('validar_senha')) {
    console.log('Edge function needs MODE 3 patch - run _patch_edge.mjs separately');
  } else {
    console.log('Edge function already has MODE 3');
  }
}

console.log('\nALL PATCHES APPLIED!');
