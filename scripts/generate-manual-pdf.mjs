import fs from 'node:fs'
import path from 'node:path'
import { jsPDF } from 'jspdf'

const inputPath = path.resolve('docs/MANUAL_OPERACAO_SISTEMA_CLIENTE_FINAL.md')
const outputPath = path.resolve('docs/MANUAL_OPERACAO_SISTEMA_CLIENTE_FINAL.pdf')

const markdown = fs.readFileSync(inputPath, 'utf8')
const lines = markdown.split(/\r?\n/)

const doc = new jsPDF({ unit: 'pt', format: 'a4' })
const pageWidth = doc.internal.pageSize.getWidth()
const pageHeight = doc.internal.pageSize.getHeight()
const marginX = 48
const marginTop = 52
const marginBottom = 48
const contentWidth = pageWidth - marginX * 2

let y = marginTop

const ensureSpace = (needed = 18) => {
  if (y + needed > pageHeight - marginBottom) {
    doc.addPage()
    y = marginTop
  }
}

const writeText = (text, fontSize = 11, fontStyle = 'normal', lineGap = 6) => {
  doc.setFont('helvetica', fontStyle)
  doc.setFontSize(fontSize)
  const wrapped = doc.splitTextToSize(text, contentWidth)

  for (const part of wrapped) {
    ensureSpace(fontSize + 4)
    doc.text(String(part), marginX, y)
    y += fontSize + 4
  }
  y += lineGap
}

for (const rawLine of lines) {
  const line = rawLine.trimEnd()

  if (!line.trim()) {
    y += 6
    ensureSpace(12)
    continue
  }

  if (line.startsWith('# ')) {
    ensureSpace(30)
    writeText(line.replace(/^#\s+/, ''), 18, 'bold', 8)
    continue
  }

  if (line.startsWith('## ')) {
    ensureSpace(24)
    writeText(line.replace(/^##\s+/, ''), 14, 'bold', 6)
    continue
  }

  if (line.startsWith('### ')) {
    ensureSpace(22)
    writeText(line.replace(/^###\s+/, ''), 12, 'bold', 4)
    continue
  }

  if (line.startsWith('- ')) {
    writeText(`• ${line.slice(2)}`, 11, 'normal', 2)
    continue
  }

  if (/^\d+\)\s+/.test(line)) {
    writeText(line, 11, 'normal', 2)
    continue
  }

  writeText(line, 11, 'normal', 3)
}

const totalPages = doc.getNumberOfPages()
for (let page = 1; page <= totalPages; page += 1) {
  doc.setPage(page)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 20, { align: 'right' })
}

doc.save(outputPath)
console.log(`PDF gerado em: ${outputPath}`)
