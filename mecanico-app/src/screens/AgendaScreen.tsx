// ============================================================
// AgendaScreen v2.1 — Calendário mensal completo com indicadores
// Dados de maintenance_schedule
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import type { MaintenanceEvent } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7); // 16px padding each side

const TIPO_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  preventiva: { bg: COLORS.infoBg, dot: COLORS.info, label: 'Preventiva' },
  lubrificacao: { bg: '#FFF3E0', dot: '#E65100', label: 'Lubrificação' },
  inspecao: { bg: COLORS.warningBg, dot: COLORS.warning, label: 'Inspeção' },
  preditiva: { bg: '#F3E5F5', dot: '#7B1FA2', label: 'Preditiva' },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatISO(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default function AgendaScreen() {
  const { empresaId } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const todayISO = formatISO(today);

  const monthStart = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-01`;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEnd = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const load = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('maintenance_schedule')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('data_programada', monthStart)
      .lte('data_programada', monthEnd)
      .order('data_programada');

    setEvents(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [empresaId, monthStart, monthEnd]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // Auto-refresh on realtime changes
  useRealtimeRefresh('AgendaScreen', load);

  // Map: date -> list of tipo
  const eventsByDay = useMemo(() => {
    const map: Record<string, string[]> = {};
    events.forEach((e) => {
      if (!map[e.data_programada]) map[e.data_programada] = [];
      map[e.data_programada].push(e.tipo);
    });
    return map;
  }, [events]);

  const filteredEvents = events.filter((e) => {
    if (tipoFilter && e.tipo !== tipoFilter) return false;
    if (selectedDay && e.data_programada !== selectedDay) return false;
    return true;
  });

  const prevMonth = () => { setMonthOffset((o) => o - 1); setSelectedDay(null); };
  const nextMonth = () => { setMonthOffset((o) => o + 1); setSelectedDay(null); };
  const goToday = () => { setMonthOffset(0); setSelectedDay(null); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
    >
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToday} style={{ alignItems: 'center' }}>
          <Text style={styles.monthLabel}>{MESES[viewMonth]} {viewYear}</Text>
          {monthOffset !== 0 && <Text style={styles.todayLink}>Ir para hoje</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {DIAS_SEMANA.map((d) => (
          <View key={d} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) return <View key={di} style={styles.dayCell} />;
              const iso = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const isToday = iso === todayISO;
              const isSelected = selectedDay === iso;
              const dayEvents = eventsByDay[iso] || [];
              const hasEvents = dayEvents.length > 0;
              const uniqueTipos = [...new Set(dayEvents)];

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.dayCell,
                    hasEvents && styles.dayCellHasEvents,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelectedDay(isSelected ? null : iso)}
                  activeOpacity={0.6}
                >
                  <Text style={[
                    styles.dayNum,
                    isToday && !isSelected && styles.dayNumToday,
                    isSelected && styles.dayNumSelected,
                  ]}>
                    {day}
                  </Text>
                  {hasEvents && (
                    <View style={styles.dotsRow}>
                      {uniqueTipos.slice(0, 3).map((tipo, ti) => {
                        const tc = TIPO_COLORS[tipo] || TIPO_COLORS.preventiva;
                        return (
                          <View
                            key={ti}
                            style={[styles.dot, { backgroundColor: isSelected ? '#FFF' : tc.dot }]}
                          />
                        );
                      })}
                    </View>
                  )}
                  {dayEvents.length > 1 && !isSelected && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{dayEvents.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {Object.entries(TIPO_COLORS).map(([key, val]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: val.dot }]} />
            <Text style={styles.legendText}>{val.label}</Text>
          </View>
        ))}
      </View>

      {/* Tipo filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          style={[styles.tipoChip, !tipoFilter && styles.tipoChipActive]}
          onPress={() => setTipoFilter(null)}
        >
          <Text style={[styles.tipoChipText, !tipoFilter && { color: '#FFF' }]}>Todos</Text>
        </TouchableOpacity>
        {Object.entries(TIPO_COLORS).map(([key, val]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tipoChip, tipoFilter === key && { backgroundColor: val.dot, borderColor: val.dot }]}
            onPress={() => setTipoFilter(tipoFilter === key ? null : key)}
          >
            <Text style={[styles.tipoChipText, tipoFilter === key && { color: '#FFF' }]}>{val.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selected day label */}
      {selectedDay && (
        <View style={styles.selectedLabel}>
          <Text style={styles.selectedLabelText}>
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      )}

      {/* Events list */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : filteredEvents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{selectedDay ? '📅' : '🗓️'}</Text>
          <Text style={styles.emptyText}>
            {selectedDay ? 'Nenhum evento neste dia' : 'Nenhum evento neste mês'}
          </Text>
        </View>
      ) : (
        filteredEvents.map((ev) => {
          const tc = TIPO_COLORS[ev.tipo] || TIPO_COLORS.preventiva;
          return (
            <View key={ev.id} style={[styles.eventCard, { borderLeftColor: tc.dot }]}>
              <View style={styles.eventHeader}>
                <View style={[styles.tipoBadge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.tipoBadgeText, { color: tc.dot }]}>{tc.label}</Text>
                </View>
                <Text style={styles.eventDate}>
                  {new Date(ev.data_programada + 'T12:00:00').toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text style={styles.eventTitle}>{ev.titulo}</Text>
              {ev.descricao && <Text style={styles.eventDesc}>{ev.descricao}</Text>}
              {ev.responsavel && (
                <Text style={styles.eventResp}>Responsável: {ev.responsavel}</Text>
              )}
            </View>
          );
        })
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 20 },

  // Month nav
  monthNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  navBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.small,
  },
  navBtnText: { fontSize: 24, color: COLORS.textPrimary, fontWeight: '600' },
  monthLabel: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.textPrimary },
  todayLink: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 2 },

  // Weekday headers
  weekdayRow: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4,
  },
  weekdayCell: { width: CELL_SIZE, alignItems: 'center' },
  weekdayText: { fontSize: 12, fontWeight: '700', color: COLORS.textHint },

  // Calendar grid
  calendarGrid: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, borderRadius: SIZES.radiusMD,
    paddingVertical: 4, ...SHADOWS.small,
  },
  weekRow: { flexDirection: 'row', paddingHorizontal: 0 },
  dayCell: {
    width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center',
    borderRadius: SIZES.radiusSM, position: 'relative',
  },
  dayCellHasEvents: { backgroundColor: '#F0F7FF' },
  dayCellToday: {
    borderWidth: 2, borderColor: COLORS.primary,
  },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayNum: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, fontWeight: '600' },
  dayNumToday: { color: COLORS.primary, fontWeight: '800' },
  dayNumSelected: { color: '#FFF', fontWeight: '800' },

  // Dots
  dotsRow: {
    flexDirection: 'row', marginTop: 2, gap: 3, justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },

  // Count badge (for days with multiple events)
  countBadge: {
    position: 'absolute', top: 2, right: 4,
    backgroundColor: COLORS.primary, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // Legend
  legendRow: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16,
    marginTop: 10, marginBottom: 4, gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  // Filters
  filterScroll: { marginTop: 8, marginBottom: 8, flexGrow: 0 },
  tipoChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.surface,
  },
  tipoChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tipoChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  // Selected day label
  selectedLabel: { paddingHorizontal: 16, marginBottom: 8 },
  selectedLabelText: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.primaryDark, textTransform: 'capitalize' },

  // Events
  eventCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD, marginHorizontal: 16, marginBottom: 10,
    borderLeftWidth: 4, ...SHADOWS.small,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tipoBadgeText: { fontSize: 12, fontWeight: '700' },
  eventDate: { fontSize: 12, color: COLORS.textHint },
  eventTitle: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  eventDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  eventResp: { fontSize: 12, color: COLORS.textHint, fontStyle: 'italic' },

  // Empty
  empty: { paddingTop: 30, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: SIZES.fontSM, color: COLORS.textHint },
});
