import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { usePlanosLubrificacao } from '@/hooks/useLubrificacao';
import type { PlanoLubrificacao } from '@/types/lubrificacao';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PRIORIDADE_COLORS: Record<string, string> = {
  critica: 'bg-red-500 text-white',
  alta: 'bg-orange-500 text-white',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  baixa: 'bg-blue-100 text-blue-800 border-blue-300',
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function computeOccurrences(plano: PlanoLubrificacao, monthStart: Date, monthEnd: Date): Date[] {
  if (!plano.proxima_execucao || !plano.ativo) return [];
  const periodicidade = plano.periodicidade ?? 0;
  const tipo = plano.tipo_periodicidade;
  if (!periodicidade || !tipo) {
    const d = new Date(plano.proxima_execucao);
    return d >= monthStart && d <= monthEnd ? [d] : [];
  }

  let daysInterval = periodicidade;
  if (tipo === 'semanas') daysInterval = periodicidade * 7;
  else if (tipo === 'meses') daysInterval = periodicidade * 30;
  else if (tipo === 'horas') daysInterval = Math.max(1, Math.round(periodicidade / 24));

  const results: Date[] = [];
  let cursor = new Date(plano.proxima_execucao);

  // Rewind if cursor is before month start
  if (cursor < monthStart && daysInterval > 0) {
    const diff = Math.floor((monthStart.getTime() - cursor.getTime()) / (daysInterval * 86400000));
    cursor = addDays(cursor, diff * daysInterval);
  }

  // Collect occurrences within the month window
  for (let i = 0; i < 60; i++) {
    if (cursor > monthEnd) break;
    if (cursor >= monthStart) results.push(new Date(cursor));
    cursor = addDays(cursor, daysInterval);
  }

  return results;
}

export default function CronogramaLubrificacao() {
  const { data: planos, isLoading } = usePlanosLubrificacao();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const calendarWeeks = useMemo(() => {
    const firstDay = monthStart.getDay();
    const totalDays = monthEnd.getDate();
    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= totalDays; d++) {
      week.push(new Date(year, month, d));
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [year, month]);

  const dayMap = useMemo(() => {
    if (!planos) return new Map<string, { plano: PlanoLubrificacao; date: Date }[]>();
    const map = new Map<string, { plano: PlanoLubrificacao; date: Date }[]>();
    for (const plano of planos) {
      const occs = computeOccurrences(plano, monthStart, monthEnd);
      for (const date of occs) {
        const key = dateKey(date);
        const list = map.get(key) || [];
        list.push({ plano, date });
        map.set(key, list);
      }
    }
    return map;
  }, [planos, year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedPlanos = selectedDay ? dayMap.get(selectedDay) || [] : [];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-[500px] w-full" /></div>;

  const todayKey = dateKey(today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Cronograma de Lubrificação
          </h2>
          <p className="text-sm text-muted-foreground">
            {planos?.filter((p) => p.ativo).length || 0} planos ativos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold min-w-[160px] text-center">{MESES[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}>Hoje</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {DIAS_SEMANA.map((d) => (
                  <th key={d} className="p-1 text-xs text-center text-muted-foreground font-medium border-b">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarWeeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    if (!day) return <td key={di} className="border p-1 bg-muted/20 min-h-[80px] align-top" />;
                    const key = dateKey(day);
                    const items = dayMap.get(key) || [];
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDay;
                    return (
                      <td
                        key={di}
                        className={`border p-1 min-h-[80px] align-top cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                        onClick={() => setSelectedDay(key)}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : 'text-muted-foreground'}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {items.slice(0, 3).map(({ plano }, i) => (
                            <div key={i} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${PRIORIDADE_COLORS[plano.prioridade || 'media']}`}>
                              {plano.codigo}
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center">+{items.length - 3}</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Day detail panel */}
      {selectedDay && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              <span className="text-muted-foreground ml-2">— {selectedPlanos.length} {selectedPlanos.length === 1 ? 'plano' : 'planos'}</span>
            </h3>
            {selectedPlanos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma lubrificação programada.</p>
            ) : (
              <div className="space-y-2">
                {selectedPlanos.map(({ plano }, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded border bg-card">
                    <Badge className={PRIORIDADE_COLORS[plano.prioridade || 'media']}>{plano.prioridade || 'média'}</Badge>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-primary font-semibold mr-2">{plano.codigo}</span>
                      <span className="text-sm">{plano.nome}</span>
                    </div>
                    {plano.responsavel_nome && <span className="text-xs text-muted-foreground">{plano.responsavel_nome}</span>}
                    {plano.tempo_estimado && <span className="text-xs text-muted-foreground">{plano.tempo_estimado} min</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
