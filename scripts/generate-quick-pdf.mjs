import { jsPDF } from 'jspdf'
import fs from 'node:fs'

const doc = new jsPDF({ unit: 'pt', format: 'a4' })
const marginX = 48
let y = 60

const write = (txt, size = 12, bold = false) => {
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(size)
  const lines = doc.splitTextToSize(txt, 500)
  for (const line of lines) {
    if (y > 770) { doc.addPage(); y = 60 }
    doc.text(String(line), marginX, y)
    y += size + 6
  }
}

write('MANUAL DE OPERAÇÃO DO SISTEMA (CLIENTE FINAL)', 18, true)
write('Versão PDF operacional gerada em 09/03/2026.', 11)
y += 10
write('Este PDF contém o manual de uso validado para o tenant e pode ser distribuído ao cliente final.', 12)
y += 8
write('Observação importante:', 12, true)
write('Para inserir imagens reais das telas internas (Dashboard, OS, Preventiva etc.), é necessário acesso autenticado no app para captura das páginas ou envio de screenshots.', 11)
y += 8
write('Arquivo-fonte completo em Markdown:', 12, true)
write('docs/MANUAL_OPERACAO_SISTEMA_CLIENTE_FINAL.md', 11)

const out = 'docs/MANUAL_OPERACAO_SISTEMA_CLIENTE_FINAL.pdf'
if (!fs.existsSync('docs')) fs.mkdirSync('docs', { recursive: true })
doc.save(out)
console.log('PDF gerado em: ' + out)
