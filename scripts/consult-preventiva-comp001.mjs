import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function consultarPreventiva() {
  try {
    console.log('🔍 Consultando preventivas com TAG ou código COMP-001...\n');

    const { data, error } = await supabase
      .from('planos_preventivos')
      .select('*')
      .or(`tag.eq.COMP-001,codigo.eq.COMP-001`)
      .limit(5);

    if (error) {
      console.error('❌ Erro na consulta:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  Nenhuma preventiva encontrada com TAG ou código COMP-001');
      console.log('\n📋 Tentando listar todas as preventivas para você ver quais existem...\n');

      const { data: allData, error: allError } = await supabase
        .from('planos_preventivos')
        .select('id, codigo, nome, tag, tipo_gatilho, frequencia_dias, especialidade, ativo')
        .limit(20);

      if (allError) {
        console.error('❌ Erro ao listar tudo:', allError);
      } else {
        console.log('📚 Preventivas registradas:');
        console.table(allData);
      }
      return;
    }

    console.log(`✅ Encontradas ${data.length} preventivas:\n`);
    
    data.forEach((plano, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Preventiva ${index + 1}`);
      console.log(`${'='.repeat(80)}`);
      console.log(JSON.stringify(plano, null, 2));
    });

  } catch (err) {
    console.error('💥 Erro inesperado:', err);
  }
}

consultarPreventiva();
