const fs = require('fs');
const path = require('path');

function walk(dir){
  if(!fs.existsSync(dir)) return [];
  let out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out=out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

const migFiles = walk('supabase/migrations').filter(f=>f.endsWith('.sql'));
const srcFiles = walk('src').filter(f=>/\.(ts|tsx|js|jsx)$/.test(f));
const fnFiles = walk('supabase/functions').filter(f=>/\.(ts|sql|js)$/.test(f));

const created = new Set();
for(const f of migFiles){
  const txt = fs.readFileSync(f,'utf8');
  const re = /CREATE TABLE(?: IF NOT EXISTS)?\s+public\.([a-zA-Z0-9_]+)/gi;
  let m; while((m=re.exec(txt))) created.add(m[1]);
}

function countRefs(files, table){
  const patterns = [
    new RegExp(`\\.from\\('\\s*${table}\\s*'\\)`, 'g'),
    new RegExp(`\\b${table}\\b`, 'g')
  ];
  let c=0;
  for(const f of files){
    const txt = fs.readFileSync(f,'utf8');
    let found=false;
    for(const p of patterns){ if(p.test(txt)){ found=true; break; } }
    if(found) c++;
  }
  return c;
}

const rows=[];
for(const t of [...created].sort()){
  const srcRef = countRefs(srcFiles, t);
  const fnRef = countRefs(fnFiles, t);
  const migRef = countRefs(migFiles, t);
  rows.push({table:t, srcRef, fnRef, migRef});
}

const used = rows.filter(r=>r.srcRef>0 || r.fnRef>0);
const indirect = rows.filter(r=>r.srcRef===0 && r.fnRef===0 && r.migRef>1);
const candidates = rows.filter(r=>r.srcRef===0 && r.fnRef===0 && r.migRef<=1);

console.log('=== RESUMO ===');
console.log('Tabelas criadas em migrations:', rows.length);
console.log('Usadas por app/funcoes:', used.length);
console.log('Sem uso direto, mas citadas em migrations (possivel dependencia):', indirect.length);
console.log('Candidatas sem referencia direta:', candidates.length);

console.log('\n=== CANDIDATAS (revisar antes de excluir) ===');
for(const r of candidates){ console.log(`${r.table} | src:${r.srcRef} fn:${r.fnRef} mig:${r.migRef}`); }

console.log('\n=== SEM USO DIRETO, MAS COM DEPENDENCIAS EM MIGRATIONS ===');
for(const r of indirect){ console.log(`${r.table} | src:${r.srcRef} fn:${r.fnRef} mig:${r.migRef}`); }

console.log('\n=== USADAS DIRETAMENTE (APP/FUNCOES) ===');
for(const r of used){ console.log(`${r.table} | src:${r.srcRef} fn:${r.fnRef} mig:${r.migRef}`); }
