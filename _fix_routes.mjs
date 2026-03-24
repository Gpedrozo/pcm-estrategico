import { readFileSync, writeFileSync } from 'fs';
let content = readFileSync('src/App.tsx', 'utf8');

const oldBlock = `                <Route path="/status" element={<SystemStatus />} />
              </Route>

                {/* Manual de Opera`;

const newStart = `                <Route path="/status" element={<SystemStatus />} />

                {/* Manual de Opera`;

content = content.replace(oldBlock, newStart);

// Now find and replace the tenant manual section  
const oldTenantManual = `\u00e7\u00e3o \u2014 22 cap\u00edtulos (tenant) */}
                <Route path="/manuais-operacao/imprimir" element={<ManualPrintAll />} />
                <Route path="/manuais-operacao"`;

const newTenantManual = `\u00e7\u00e3o \u2014 22 cap\u00edtulos (dentro do AppLayout) */}
                <Route path="/manuais-operacao"`;

content = content.replace(oldTenantManual, newTenantManual);

// Move imprimir routes and close AppLayout after manual routes
const oldEnd = `                </Route>

                <Route path="/manual/imprimir" element={<ManualPrintAll />} />
                <Route path="/manual" element={<ManualLayout />}>`;

const newEnd = `                </Route>

                <Route path="/manual" element={<ManualLayout />}>`;

content = content.replace(oldEnd, newEnd);

// Close AppLayout after /manual routes and add print routes outside
const oldClose = `                </Route>

                <Route path="*" element={<NotFound />} />`;

const newClose = `                </Route>
              </Route>

                {/* Impress\u00e3o (fora do AppLayout \u2014 tela cheia para PDF) */}
                <Route path="/manuais-operacao/imprimir" element={<ManualPrintAll />} />
                <Route path="/manual/imprimir" element={<ManualPrintAll />} />

                <Route path="*" element={<NotFound />} />`;

content = content.replace(oldClose, newClose);

writeFileSync('src/App.tsx', content, 'utf8');
console.log('Done');
