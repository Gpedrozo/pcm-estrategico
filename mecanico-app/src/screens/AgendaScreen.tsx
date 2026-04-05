// ============================================================
// AgendaScreen v2.0 — Calendário semanal (somente leitura)
// Dados de maintenance_schedule
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import type { MaintenanceEvent } from '../types';

const TIPO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  preventiva: { bg: COLORS.infoBg, text: COLORS.info, label: 'Preventiva' },
  lubrificacao: { bg: '#FFF3E0', text: '#E65100', label: 'Lubrificação' },
  inspecao: { bg: COLORS.warningBg, text: COLORS.warning, label: 'Inspeção' },
  preditiva: { bg: '#F3E5F5', text: '#7B1FA2', label: 'Preditiva' },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDates(refDate: Date): Date[] {
  const day = refDate.getDay();
  const start = new Date(refDate);
  start.setDate(start.getDate() - day); // start on Sunday
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatISO(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export default function AgendaScreen() {
  const { empresaId } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);

  const refDate = new Date();
  refDate.setDate(refDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(refDate);
  const weekStart = formatISO(weekDates[0]);
  const weekEnd = formatISO(weekDates[6]);

  const load = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('maintenance_schedule')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('data_programada', weekStart)
      .lte('data_programada', weekEnd)
      .order('data_programada');

    setEvents(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [empresaId, weekStart, weekEnd]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filteredEvents = events.filter((e) => {
    if (tipoFilter && e.tipo !== tipoFilter) return false;
    if (selectedDay && e.data_programada !== selectedDay) return false;
    return true;
  });

  const eventsForDay = (iso: string) => events.filter((e) => e.data_programada === iso);

  const weekLabel = () => {
    const s = weekDates[0];
    const e = weekDates[6];
    const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${fmt(s)} — ${fmt(e)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
    >
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setWeekOffset((w) => w - 1); setSelectedDay(null); }}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.weekLabel}>{weekLabel()}</Text>
          {weekOffset !== 0 && (
            <TouchableOpacity onPress={() => { setWeekOffset(0); setSelectedDay(null); }}>
              <Text style={styles.todayLink}>Hoje</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setWeekOffset((w) => w + 1); setSelectedDay(null); }}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Days of week */}
      <View style={styles.daysRow}>
        {weekDates.map((d, i) => {
          const iso = formatISO(d);
          const isToday = iso === formatISO(new Date());
          const isSelected = selectedDay === iso;
          const count = eventsForDay(iso).length;

          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
              onPress={() => setSelectedDay(isSelected ? null : iso)}
            >
              <Text style={[styles.dayName, (isSelected || isToday) && { color: isSelected ? '#FFF' : COLORS.primary }]}>{DIAS_SEMANA[i]}</Text>
              <Text style={[styles.dayNum, isSelected && { color: '#FFF', fontWeight: '800' }, isToday && !isSelected && { color: COLORS.primary, fontWeight: '800' }]}>
                {d.getDate()}
              </Text>
              {count > 0 && (
                <View style={[styles.dotContainer]}>
                  <View style={[styles.dot, isSelected && { backgroundColor: '#FFF' }]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tipo filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          style={[styles.tipoChip, !tipoFilter && styles.tipoChipActive]}
          onPress={() => setTipoFilter(null)}
        >
          <Text style={[styles.tipoChipText, !tipoFilter && { color: '#FFF' }]}>Todos</Text>
        </TouchableOpacity>
        {Object.entries(TIPO_COLORS).map(([key, val]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tipoChip, tipoFilter === key && { backgroundColor: val.text, borderColor: val.text }]}
            onPress={() => setTipoFilter(tipoFilter === key ? null : key)}
          >
            <Text style={[styles.tipoChipText, tipoFilter === key && { color: '#FFF' }]}>{val.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : filteredEvents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {selectedDay ? 'Nenhum evento neste dia' : 'Nenhum evento nesta semana'}
          </Text>
        </View>
      ) : (
        filteredEvents.map((ev) => {
          const tc = TIPO_COLORS[ev.tipo] || TIPO_COLORS.preventiva;
          return (
            <View key={ev.id} style={[styles.eventCard, { borderLeftColor: tc.text }]}>
              <View style={styles.eventHeader}>
                <View style={[styles.tipoBadge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.tipoBadgeText, { color: tc.text }]}>{tc.label}</Text>
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
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
  navBtnText: { fontSize: 24, color: COLORS.textPrimary, fontWeight: '600' },
  weekLabel: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary },
  todayLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  daysRow: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 14 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: SIZES.radiusSM, marginHorizontal: 2 },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayCellToday: { backgroundColor: COLORS.primaryLight },
  dayName: { fontSize: 11, color: COLORS.textHint, fontWeight: '600', marginBottom: 4 },
  dayNum: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, fontWeight: '600' },
  dotContainer: { marginTop: 4, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  tipoChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.surface },
  tipoChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tipoChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  eventCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, marginHorizontal: 16, marginBottom: 10, borderLeftWidth: 4, ...SHADOWS.small },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tipoBadgeText: { fontSize: 12, fontWeight: '700' },
  eventDate: { fontSize: 12, color: COLORS.textHint },
  eventTitle: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  eventDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  eventResp: { fontSize: 12, color: COLORS.textHint, fontStyle: 'italic' },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { fontSize: SIZES.fontSM, color: COLORS.textHint },
});
