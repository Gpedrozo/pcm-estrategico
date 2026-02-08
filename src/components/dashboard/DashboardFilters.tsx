import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, X, RotateCcw } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DashboardFiltersState {
  periodo: string;
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  area: string;
  criticidade: string;
  tipoOS: string;
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onFiltersChange: (filters: DashboardFiltersState) => void;
  areas: { id: string; nome: string }[];
  onReset: () => void;
}

const PERIODOS = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7dias', label: 'Últimos 7 dias' },
  { value: '30dias', label: 'Últimos 30 dias' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: '3meses', label: 'Últimos 3 meses' },
  { value: '6meses', label: 'Últimos 6 meses' },
  { value: '12meses', label: 'Último ano' },
  { value: 'personalizado', label: 'Personalizado' },
];

const CRITICIDADES = [
  { value: 'all', label: 'Todas' },
  { value: 'A', label: 'Crítica (A)' },
  { value: 'B', label: 'Importante (B)' },
  { value: 'C', label: 'Normal (C)' },
];

const TIPOS_OS = [
  { value: 'all', label: 'Todos' },
  { value: 'CORRETIVA', label: 'Corretiva' },
  { value: 'PREVENTIVA', label: 'Preventiva' },
  { value: 'PREDITIVA', label: 'Preditiva' },
  { value: 'INSPECAO', label: 'Inspeção' },
  { value: 'MELHORIA', label: 'Melhoria' },
];

export function DashboardFilters({ filters, onFiltersChange, areas, onReset }: DashboardFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePeriodoChange = (value: string) => {
    let dataInicio: Date | undefined;
    let dataFim: Date | undefined = new Date();

    switch (value) {
      case 'hoje':
        dataInicio = new Date();
        break;
      case '7dias':
        dataInicio = subDays(new Date(), 7);
        break;
      case '30dias':
        dataInicio = subDays(new Date(), 30);
        break;
      case 'mes_atual':
        dataInicio = startOfMonth(new Date());
        dataFim = endOfMonth(new Date());
        break;
      case 'mes_anterior':
        dataInicio = startOfMonth(subMonths(new Date(), 1));
        dataFim = endOfMonth(subMonths(new Date(), 1));
        break;
      case '3meses':
        dataInicio = subMonths(new Date(), 3);
        break;
      case '6meses':
        dataInicio = subMonths(new Date(), 6);
        break;
      case '12meses':
        dataInicio = subMonths(new Date(), 12);
        break;
      case 'personalizado':
        dataInicio = filters.dataInicio;
        dataFim = filters.dataFim;
        break;
    }

    onFiltersChange({
      ...filters,
      periodo: value,
      dataInicio,
      dataFim,
    });
  };

  const activeFiltersCount = [
    filters.periodo !== '30dias',
    filters.area !== 'all',
    filters.criticidade !== 'all',
    filters.tipoOS !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount} ativo(s)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
              <RotateCcw className="h-3 w-3" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Menos filtros' : 'Mais filtros'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Período</label>
          <Select value={filters.periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filters.periodo === 'personalizado' && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInicio ? format(filters.dataInicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataInicio}
                    onSelect={(date) => onFiltersChange({ ...filters, dataInicio: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFim ? format(filters.dataFim, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataFim}
                    onSelect={(date) => onFiltersChange({ ...filters, dataFim: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        {isExpanded && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Área</label>
              <Select
                value={filters.area}
                onValueChange={(v) => onFiltersChange({ ...filters, area: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Criticidade</label>
              <Select
                value={filters.criticidade}
                onValueChange={(v) => onFiltersChange({ ...filters, criticidade: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITICIDADES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo de OS</label>
              <Select
                value={filters.tipoOS}
                onValueChange={(v) => onFiltersChange({ ...filters, tipoOS: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_OS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
