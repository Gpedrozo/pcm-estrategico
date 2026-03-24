import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('src/App.tsx', 'utf8');

// Remove the two imprimir lines that are BEFORE the manual layout routes inside AppLayout
// They appear like:
//   <Route path="/manuais-operacao/imprimir" element={<ManualPrintAll />} />
//   <Route path="/manuais-operacao" element={<ManualLayout ...

// Find first occurrence and remove that line
const line1 = '                <Route path="/manuais-operacao/imprimir" element={<ManualPrintAll />} />';
const idx1 = c.indexOf(line1);
if (idx1 !== -1) {
  // Remove this line + the newline
  const lineEnd = c.indexOf('\n', idx1);
  c = c.substring(0, idx1) + c.substring(lineEnd + 1);
  console.log('Removed first /manuais-operacao/imprimir');
}

// Find first occurrence of /manual/imprimir (should be inside AppLayout now)
const line2 = '                <Route path="/manual/imprimir" element={<ManualPrintAll />} />';
const idx2 = c.indexOf(line2);
// Only remove the first one (inside AppLayout), keep the second (outside)
if (idx2 !== -1) {
  const lineEnd2 = c.indexOf('\n', idx2);
  c = c.substring(0, idx2) + c.substring(lineEnd2 + 1);
  console.log('Removed first /manual/imprimir');
}

writeFileSync('src/App.tsx', c, 'utf8');
console.log('DONE');
