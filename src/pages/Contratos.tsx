import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Printer, Pencil, FileText, ShieldAlert, TrendingUp, CalendarClock } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export default function ContratoEstrategico({ contrato }: any) {

  const [open, setOpen] = useState(false)

  const diasRestantes = contrato.data_fim
    ? differenceInDays(new Date(contrato.data_fim), new Date())
    : null

  const saldo = (contrato.valor_total || 0) - (contrato.valor_executado || 0)

  const performance =
    contrato.sla_percentual >= 95 ? 100 :
    contrato.sla_percentual >= 85 ? 70 :
    40

  const getRiskBadge = () => {
    if (contrato.risco === 'ALTO')
      return <Badge className="bg-destructive text-white">Alto Risco</Badge>
    if (contrato.risco === 'MEDIO')
      return <Badge className="bg-warning text-black">Risco Médio</Badge>
    return <Badge className="bg-success text-white">Baixo Risco</Badge>
  }

  return (
    <>
      <Card className="shadow-lg border-2">
        <CardContent className="p-6 space-y-6">

          {/* HEADER */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {contrato.numero_contrato}
              </h2>
              <p className="text-muted-foreground">
                {contrato.titulo}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Detalhes
              </Button>

              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>

              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>

          {/* GRID ESTRATÉGICO */}
          <div className="grid grid-cols-4 gap-4">

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Valor Total</div>
                <div className="text-xl font-bold">
                  {contrato.valor_total?.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Saldo: {saldo.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Vigência</div>
                <div className="text-xl font-bold">
                  {diasRestantes !== null
                    ? `${diasRestantes} dias`
                    : 'Indeterminado'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">SLA</div>
                <Progress value={performance} />
                <div className="text-xs mt-2">
                  {contrato.sla_percentual}% cumprimento
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Risco</div>
                {getRiskBadge()}
              </CardContent>
            </Card>

          </div>

          {/* ALERTAS */}
          {diasRestantes !== null && diasRestantes <= 30 && (
            <div className="p-4 border rounded bg-warning/10 flex items-center gap-3">
              <CalendarClock className="text-warning" />
              Contrato próximo do vencimento
            </div>
          )}

        </CardContent>
      </Card>

      {/* MODAL DETALHES COMPLETO */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Visão Estratégica do Contrato
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">

            <div>
              <h3 className="font-bold mb-2">Financeiro</h3>
              <p>Valor Executado: {contrato.valor_executado}</p>
              <p>Saldo: {saldo}</p>
            </div>

            <div>
              <h3 className="font-bold mb-2">Governança</h3>
              <p>Gestor: {contrato.gestor}</p>
              <p>Responsável: {contrato.responsavel_nome}</p>
            </div>

            <div>
              <h3 className="font-bold mb-2">SLA</h3>
              <p>Atendimento: {contrato.sla_atendimento_horas}h</p>
              <p>Resolução: {contrato.sla_resolucao_horas}h</p>
            </div>

            <div>
              <h3 className="font-bold mb-2">Risco</h3>
              <p>Classificação: {contrato.risco}</p>
            </div>

          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
