import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('src/App.tsx', 'utf8');

// Find the line with /status and the </Route> that closes AppLayout
// Pattern: /status route, then </Route> closing AppLayout, then manual routes
const statusLine = '                <Route path="/status" element={<SystemStatus />} />';
const closeAppLayout = '              </Route>';

// Find the position of /status line
const statusIdx = c.indexOf(statusLine);
if (statusIdx === -1) { console.log('ERROR: status line not found'); process.exit(1); }

// Find the </Route> that closes AppLayout after /status
const afterStatus = c.indexOf('\n', statusIdx) + 1;
const closeIdx = c.indexOf(closeAppLayout, afterStatus);
if (closeIdx === -1) { console.log('ERROR: close tag not found'); process.exit(1); }

// Find next newline after closeAppLayout
const afterClose = c.indexOf('\n', closeIdx) + 1;

// Find the </Route> before <Route path="*"
const starRoute = c.indexOf('<Route path="*" element={<NotFound />} />', afterClose);
if (starRoute === -1) { console.log('ERROR: NotFound route not found'); process.exit(1); }

// Find the line start of star route
let starLineStart = c.lastIndexOf('\n', starRoute) + 1;

// Remove the first </Route> (which was closing AppLayout)
// and add it just before <Route path="*"
// Also move imprimir routes outside

// First, delete the closeAppLayout line after /status
const before = c.substring(0, afterStatus);
const afterCloseEnd = c.indexOf('\n', closeIdx) + 1;
const middle = c.substring(afterCloseEnd, starLineStart);
const after = c.substring(starLineStart);

// Build new content
let newContent = before;

// Now middle contains manual blocks + imprimir lines. Need to:
// 1. Move imprimir routes to after </Route> closing AppLayout
// 2. Close AppLayout before imprimir routes

// Extract imprimir routes from middle
let middleClean = middle;

// Remove /manuais-operacao/imprimir line
const imprimirLine1 = '                <Route path="/manuais-operacao/imprimir" element={<ManualPrintAll />} />\n';
const imprimirLine2 = '                <Route path="/manual/imprimir" element={<ManualPrintAll />} />\n';
middleClean = middleClean.replace(imprimirLine1, '');
middleClean = middleClean.replace(imprimirLine2, '');

// Also update comment
middleClean = middleClean.replace('(tenant)', '(dentro do AppLayout)');

newContent += middleClean;
newContent += '              </Route>\n\n';
newContent += '                <Route path="/manuais-operacao/imprimir" element={<ManualPrintAll />} />\n';
newContent += '                <Route path="/manual/imprimir" element={<ManualPrintAll />} />\n\n';
newContent += after;

writeFileSync('src/App.tsx', newContent, 'utf8');
console.log('DONE - routes moved inside AppLayout');
