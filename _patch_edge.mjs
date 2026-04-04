import fs from 'fs';
const file = 'C:/Users/Gustavo Pedrozo Pint/pcm-estrategico-clone/supabase/functions/mecanico-device-auth/index.ts';
let content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

// Find MODE 2 line by partial match
let idx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('MODE 2')) { idx = i; break; }
}

if (idx < 0) {
  console.error('MODE 2 marker not found!');
  process.exit(1);
}

if (content.includes('validar_senha')) {
  console.log('Already patched, skipping');
  process.exit(0);
}

const block = [
  '    // MODE 3: Validate mechanic password (action=validar_senha)',
  '    const action = String(body.action ?? "").trim();',
  '    if (action === "validar_senha") {',
  '      const mecanicoId = String(body.mecanico_id ?? "").trim();',
  '      const senhaInput = String(body.senha ?? "").trim();',
  '      if (!mecanicoId || !senhaInput) {',
  '        return respond({ ok: false, error: "mecanico_id e senha obrigat\\u00f3rios" }, req);',
  '      }',
  '      try {',
  '        const { data: mec, error: mecErr } = await admin',
  '          .from("mecanicos")',
  '          .select("id, senha_acesso")',
  '          .eq("id", mecanicoId)',
  '          .eq("ativo", true)',
  '          .is("deleted_at", null)',
  '          .maybeSingle();',
  '        if (mecErr) return respond({ ok: false, error: "Erro ao buscar mec\\u00e2nico" }, req);',
  '        if (!mec) return respond({ ok: false, error: "Mec\\u00e2nico n\\u00e3o encontrado" }, req);',
  '        if (!mec.senha_acesso) return respond({ ok: true, valid: true }, req);',
  '        const valid = mec.senha_acesso === senhaInput;',
  '        return respond({ ok: true, valid }, req);',
  '      } catch (e) {',
  '        console.error("[device-auth] validar_senha error:", e);',
  '        return respond({ ok: false, error: "Erro ao validar senha" }, req);',
  '      }',
  '    }',
  '',
];

lines.splice(idx, 0, ...block);
fs.writeFileSync(file, lines.join('\n'), 'utf-8');
console.log('DONE! Inserted', block.length, 'lines at position', idx);
