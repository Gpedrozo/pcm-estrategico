import fs from 'fs';
import path from 'path';

const base = 'C:/Users/Gustavo Pedrozo Pint/pcm-estrategico-clone';

// ─── Patch 1: syncEngine.ts ───
{
  const file = path.join(base, 'mecanico-app/src/lib/syncEngine.ts');
  let src = fs.readFileSync(file, 'utf-8');

  // Add saveDeviceConfig import
  src = src.replace(
    '  getDeviceConfig,\n} from \'./database\';',
    '  getDeviceConfig,\n  saveDeviceConfig,\n} from \'./database\';'
  );

  // Replace pullData signature and add incremental logic
  src = src.replace(
    'export async function pullData(empresaId: string): Promise<void> {\n  if (!empresaId) return;\n\n  // Pull Ordens de Servico',
    `export async function pullData(empresaId: string, forceFullRefresh = false): Promise<void> {
  if (!empresaId) return;

  // Incremental sync: use last_sync_timestamp to only fetch changed records
  // forceFullRefresh = true when user manually pulls to refresh
  const lastSync = forceFullRefresh ? null : await getDeviceConfig('last_sync_timestamp');
  const sinceTs = lastSync || '1970-01-01T00:00:00Z';

  // Helper: build query with optional updated_at filter
  function withTimestamp(query) {
    if (lastSync) {
      return query.gte('updated_at', sinceTs);
    }
    return query;
  }

  // Pull Ordens de Servico`
  );

  // Replace OS pull with incremental + higher limit
  src = src.replace(
    `  const { data: osList } = await supabase
    .from('ordens_servico')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('data_solicitacao', { ascending: false })
    .limit(200);

  if (osList) {
    for (const os of osList) {
      await upsertOrdemServico(os);
    }
  }`,
    `  const { data: osList } = await withTimestamp(
    supabase
      .from('ordens_servico')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_solicitacao', { ascending: false })
  ).limit(1000);

  if (osList) {
    for (const os of osList) {
      await upsertOrdemServico(os);
    }
    console.log(\`[sync] pulled \${osList.length} OS\${lastSync ? ' (incremental)' : ' (full)'}\`);
  }`
  );

  // Replace execucoes pull
  src = src.replace(
    `  const { data: execList } = await supabase
    .from('execucoes_os')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(500);`,
    `  const { data: execList } = await withTimestamp(
    supabase
      .from('execucoes_os')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
  ).limit(1000);`
  );

  // Replace equipamentos pull
  src = src.replace(
    `  const { data: eqList } = await supabase
    .from('equipamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .limit(500);`,
    `  const { data: eqList } = await withTimestamp(
    supabase
      .from('equipamentos')
      .select('*')
      .eq('empresa_id', empresaId)
  ).limit(1000);`
  );

  // Replace mecanicos limit
  src = src.replace(
    `.eq('ativo', true)\n    .limit(200);`,
    `.eq('ativo', true)\n    .limit(500);`
  );

  // Replace materiais pull
  src = src.replace(
    `  // Pull Materiais (cat\u00e1logo)
  // Supabase column is 'nome', SQLite uses 'descricao' \u2014 map on pull
  const { data: matList } = await supabase
    .from('materiais')
    .select('id, empresa_id, codigo, nome, unidade, estoque_atual')
    .eq('empresa_id', empresaId)
    .limit(500);`,
    `  // Pull Materiais (cat\u00e1logo)
  const { data: matList } = await withTimestamp(
    supabase
      .from('materiais')
      .select('id, empresa_id, codigo, nome, unidade, estoque_atual')
      .eq('empresa_id', empresaId)
  ).limit(1000);`
  );

  // Replace documentos pull
  src = src.replace(
    `  // Pull Documentos T\u00e9cnicos
  // Supabase column is 'titulo', SQLite uses 'nome' \u2014 map on pull
  const { data: docList } = await supabase
    .from('documentos_tecnicos')
    .select('id, empresa_id, equipamento_id, tipo, titulo, arquivo_url, created_at')
    .eq('empresa_id', empresaId)
    .limit(300);`,
    `  // Pull Documentos T\u00e9cnicos
  const { data: docList } = await withTimestamp(
    supabase
      .from('documentos_tecnicos')
      .select('id, empresa_id, equipamento_id, tipo, titulo, arquivo_url, created_at')
      .eq('empresa_id', empresaId)
  ).limit(500);`
  );

  // Replace paradas pull
  src = src.replace(
    `  // Pull Paradas (para exibir paradas de outros mec\u00e2nicos)
  const { data: paradaList } = await supabase
    .from('paradas_equipamento')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('inicio', { ascending: false })
    .limit(200);`,
    `  // Pull Paradas
  const { data: paradaList } = await withTimestamp(
    supabase
      .from('paradas_equipamento')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('inicio', { ascending: false })
  ).limit(500);`
  );

  // Replace requisicoes pull
  src = src.replace(
    `  // Pull Requisicoes (para ver status)
  const { data: reqList } = await supabase
    .from('requisicoes_material')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(200);`,
    `  // Pull Requisicoes
  const { data: reqList } = await withTimestamp(
    supabase
      .from('requisicoes_material')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
  ).limit(500);`
  );

  // Add saveDeviceConfig call at end of pullData
  src = src.replace(
    `  if (reqList) {
    for (const r of reqList) {
      await upsertRequisicao({ ...r, sync_status: 'synced' });
    }
  }
}`,
    `  if (reqList) {
    for (const r of reqList) {
      await upsertRequisicao({ ...r, sync_status: 'synced' });
    }
  }

  // Save sync timestamp for next incremental pull
  await saveDeviceConfig('last_sync_timestamp', new Date().toISOString());
}`
  );

  // Replace runSyncCycle signature
  src = src.replace(
    'export async function runSyncCycle(): Promise<{ pushed: number; pulled: boolean }> {',
    'export async function runSyncCycle(forceFullRefresh = false): Promise<{ pushed: number; pulled: boolean }> {'
  );

  // Replace pullData call in runSyncCycle
  src = src.replace(
    '      await pullData(empresaId);\n    }',
    '      await pullData(empresaId, forceFullRefresh);\n    }'
  );

  fs.writeFileSync(file, src, 'utf-8');
  console.log('PATCHED syncEngine.ts');
}

// ─── Patch 2: HistoryScreen.tsx ───
{
  const file = path.join(base, 'mecanico-app/src/screens/HistoryScreen.tsx');
  let src = fs.readFileSync(file, 'utf-8');

  // Add import
  src = src.replace(
    "import { getExecucoesHistorico } from '../lib/database';",
    "import { getExecucoesHistorico } from '../lib/database';\nimport { runSyncCycle } from '../lib/syncEngine';"
  );

  // Replace onRefresh
  src = src.replace(
    `  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };`,
    `  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runSyncCycle(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  };`
  );

  fs.writeFileSync(file, src, 'utf-8');
  console.log('PATCHED HistoryScreen.tsx');
}

// ─── Patch 3: OSDetailScreen.tsx ───
{
  const file = path.join(base, 'mecanico-app/src/screens/OSDetailScreen.tsx');
  let src = fs.readFileSync(file, 'utf-8');

  // Add import
  src = src.replace(
    "} from '../lib/database';\nimport LoadingScreen",
    "} from '../lib/database';\nimport { runSyncCycle } from '../lib/syncEngine';\nimport LoadingScreen"
  );

  // Replace onRefresh
  src = src.replace(
    `  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };`,
    `  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runSyncCycle(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  };`
  );

  fs.writeFileSync(file, src, 'utf-8');
  console.log('PATCHED OSDetailScreen.tsx');
}

// ─── Patch 4: HomeScreen.tsx ───
{
  const file = path.join(base, 'mecanico-app/src/screens/HomeScreen.tsx');
  let src = fs.readFileSync(file, 'utf-8');

  // Replace onRefresh to use forceFullRefresh
  src = src.replace(
    '      await runSyncCycle();\n      await loadData();',
    '      await runSyncCycle(true);\n      await loadData();'
  );

  fs.writeFileSync(file, src, 'utf-8');
  console.log('PATCHED HomeScreen.tsx');
}

// ─── Patch 5: MecanicoSelectScreen.tsx ───
{
  const file = path.join(base, 'mecanico-app/src/screens/MecanicoSelectScreen.tsx');
  let src = fs.readFileSync(file, 'utf-8');

  // Replace handleValidarSenha to use edge function
  src = src.replace(
    `    try {
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
        // Senha correta — prossegue
        await selectMecanico(selectedMec.id, selectedMec.nome);
      } else {
        setSenhaError('Senha incorreta');
        setValidating(false);
      }
    } catch (err: any) {
      console.warn('[MecanicoSelect] erro validação:', err);
      setSenhaError('Erro de conexão. Verifique sua internet.');
      setValidating(false);
    }`,
    `    try {
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
        console.warn('[MecanicoSelect] Validação error:', result.error);
        setSenhaError(result.error || 'Erro ao validar. Tente novamente.');
        setValidating(false);
        return;
      }

      if (result.valid === true) {
        // Senha correta — prossegue
        await selectMecanico(selectedMec.id, selectedMec.nome);
      } else {
        setSenhaError('Senha incorreta');
        setValidating(false);
      }
    } catch (err: any) {
      console.warn('[MecanicoSelect] erro validação:', err);
      setSenhaError('Erro de conexão. Verifique sua internet.');
      setValidating(false);
    }`
  );

  // Replace handleRefresh to use forceFullRefresh
  src = src.replace(
    `      // Força busca do Supabase (sempre atualizado)
      const freshList = await fetchFromSupabase();
      if (freshList.length > 0) {
        setMecanicos(freshList);
      } else {
        // Fallback: tenta sync + local
        await runSyncCycle();
        await loadMecanicos();
      }`,
    `      // Força sync completo (full refresh) + busca fresca
      await runSyncCycle(true);
      const freshList = await fetchFromSupabase();
      if (freshList.length > 0) {
        setMecanicos(freshList);
      } else {
        await loadMecanicos();
      }`
  );

  // Add SUPABASE_URL, SUPABASE_ANON_KEY import if not present
  if (!src.includes('SUPABASE_URL')) {
    src = src.replace(
      "import { supabase } from '../lib/supabase';",
      "import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';"
    );
  }

  fs.writeFileSync(file, src, 'utf-8');
  console.log('PATCHED MecanicoSelectScreen.tsx');
}

console.log('\nALL PATCHES APPLIED!');
