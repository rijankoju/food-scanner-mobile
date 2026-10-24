import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLogWeight, useMe, useStats, useWeights } from '@/api/queries';
import type { DailyTotal } from '@/api/types';
import { Button, Card, ErrorText, TextField } from '@/components/ui';
import { addDays, localDate } from '@/lib/date';
import { colors, spacing } from '@/theme';

const PLOT_HEIGHT = 160;
const BAR_WIDTH = 24;

export default function ProgressScreen() {
  const [weeksBack, setWeeksBack] = useState(0);
  const to = addDays(localDate(), -7 * weeksBack);
  const from = addDays(to, -6);
  const stats = useStats(from, to);
  const me = useMe();

  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const byDate = new Map((stats.data ?? []).map((d) => [d.date, d]));
  const logged = days.map((d) => byDate.get(d)).filter((d): d is DailyTotal => !!d);
  const average = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : null;
  const goalKcal = me.data?.goal?.kcal ?? null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.weekRow}>
          <Pressable onPress={() => setWeeksBack(weeksBack + 1)} hitSlop={12} accessibilityLabel="Previous week">
            <Text style={styles.arrow}>‹</Text>
          </Pressable>
          <Text style={styles.weekLabel}>{weeksBack === 0 ? 'Last 7 days' : `${shortDate(from)} – ${shortDate(to)}`}</Text>
          <Pressable
            onPress={() => setWeeksBack(weeksBack - 1)}
            disabled={weeksBack === 0}
            hitSlop={12}
            accessibilityLabel="Next week"
          >
            <Text style={[styles.arrow, weeksBack === 0 && styles.arrowDisabled]}>›</Text>
          </Pressable>
        </View>

        <Card style={{ opacity: stats.isPlaceholderData ? 0.6 : 1 }}>
          <Text style={styles.cardTitle}>Calories per day</Text>
          <View style={styles.statRow}>
            <Text style={styles.hero}>{average !== null ? average.toLocaleString() : '–'}</Text>
            <Text style={styles.muted}>
              {average !== null
                ? `avg kcal over ${logged.length} logged day${logged.length === 1 ? '' : 's'}`
                : 'nothing logged this week'}
              {goalKcal ? ` · goal ${goalKcal.toLocaleString()}` : ''}
            </Text>
          </View>
          <ErrorText error={stats.error} />
          <CalorieColumns days={days} byDate={byDate} goalKcal={goalKcal} />
        </Card>

        {logged.length > 0 ? (
          <Card style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.th, styles.dayCol]}>Day</Text>
              <Text style={styles.th}>kcal</Text>
              <Text style={styles.th}>Protein</Text>
              <Text style={styles.th}>Carbs</Text>
              <Text style={styles.th}>Fat</Text>
            </View>
            {[...logged].reverse().map((d) => (
              <View key={d.date} style={styles.tableRow}>
                <Text style={[styles.td, styles.dayCol]}>{shortDate(d.date)}</Text>
                <Text style={styles.td}>{Math.round(d.kcal)}</Text>
                <Text style={styles.td}>{Math.round(d.proteinG)} g</Text>
                <Text style={styles.td}>{Math.round(d.carbsG)} g</Text>
                <Text style={styles.td}>{Math.round(d.fatG)} g</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <WeightSection />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * One column per day from a shared baseline, with the goal as a hairline.
 * Tapping a column shows its value; the table below lists every value too.
 */
function CalorieColumns({
  days,
  byDate,
  goalKcal,
}: {
  days: string[];
  byDate: Map<string, DailyTotal>;
  goalKcal: number | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(goalKcal ?? 0, ...days.map((d) => byDate.get(d)?.kcal ?? 0), 1) * 1.1;
  const y = (kcal: number) => (kcal / max) * PLOT_HEIGHT;
  const selectedDay = selected ? byDate.get(selected) : undefined;

  return (
    <View>
      <Text style={styles.caption}>
        {selected
          ? `${shortDate(selected)}: ${selectedDay ? `${Math.round(selectedDay.kcal).toLocaleString()} kcal` : 'nothing logged'}`
          : 'Tap a day to see its total'}
      </Text>
      <View style={styles.plot}>
        {goalKcal ? (
          <View style={[styles.goalLine, { bottom: y(goalKcal) }]}>
            <Text style={styles.goalLabel}>goal</Text>
          </View>
        ) : null}
        {days.map((day) => {
          const kcal = byDate.get(day)?.kcal ?? 0;
          return (
            <Pressable
              key={day}
              style={styles.slot}
              onPress={() => setSelected(day === selected ? null : day)}
              accessibilityRole="button"
              accessibilityLabel={`${shortDate(day)}: ${Math.round(kcal)} kcal`}
            >
              {kcal > 0 ? (
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(y(kcal), 2) },
                    selected !== null && selected !== day && styles.barMuted,
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {days.map((day) => (
          <Text key={day} style={[styles.axisLabel, day === selected && styles.axisLabelSelected]}>
            {weekdayLetter(day)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function WeightSection() {
  const today = localDate();
  const weights = useWeights(addDays(today, -90), today);
  const logWeight = useLogWeight();
  const [kg, setKg] = useState('');

  const save = () => {
    const value = Number(kg.replace(',', '.'));
    if (value >= 20 && value <= 400) {
      logWeight.mutate({ date: today, kg: value }, { onSuccess: () => setKg('') });
    }
  };

  const points = [...(weights.data ?? [])].reverse();

  return (
    <Card>
      <Text style={styles.cardTitle}>Weight</Text>
      <View style={styles.weightInput}>
        <View style={{ flex: 1 }}>
          <TextField label="Today (kg)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="70.5" />
        </View>
        <Button title="Save" onPress={save} loading={logWeight.isPending} style={{ alignSelf: 'flex-end' }} />
      </View>
      <ErrorText error={logWeight.error ?? weights.error} />
      {points.length === 0 ? (
        <Text style={styles.muted}>Log your weight regularly to see the trend here.</Text>
      ) : (
        points.slice(0, 10).map((p, i) => {
          const previous = points[i + 1];
          const change = previous ? Math.round((p.kg - previous.kg) * 10) / 10 : null;
          return (
            <View key={p.date} style={styles.tableRow}>
              <Text style={[styles.td, styles.dayCol]}>{shortDate(p.date)}</Text>
              <Text style={styles.td}>{p.kg} kg</Text>
              <Text style={[styles.td, styles.muted]}>
                {change === null ? '' : `${change > 0 ? '+' : ''}${change} kg`}
              </Text>
            </View>
          );
        })
      )}
    </Card>
  );
}

function parse(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shortDate(isoDate: string) {
  return parse(isoDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function weekdayLetter(isoDate: string) {
  return parse(isoDate).toLocaleDateString(undefined, { weekday: 'narrow' });
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  weekLabel: { fontSize: 17, fontWeight: '600', color: colors.text, minWidth: 180, textAlign: 'center' },
  arrow: { fontSize: 28, color: colors.text, paddingHorizontal: spacing.sm },
  arrowDisabled: { color: colors.border },
  cardTitle: { fontSize: 14, color: colors.textMuted },
  statRow: { gap: 2 },
  hero: { fontSize: 40, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  caption: { fontSize: 13, color: colors.text, marginBottom: spacing.sm, minHeight: 18 },
  plot: {
    height: PLOT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barMuted: { opacity: 0.35 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.textMuted,
    zIndex: 1,
    pointerEvents: 'none',
  },
  goalLabel: { position: 'absolute', right: 0, bottom: 2, fontSize: 11, color: colors.textMuted },
  axis: { flexDirection: 'row', marginTop: spacing.xs },
  axisLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.textMuted },
  axisLabelSelected: { color: colors.text, fontWeight: '600' },
  table: { gap: 0, paddingVertical: spacing.sm },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayCol: { flex: 1.6, textAlign: 'left' },
  th: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'right' },
  td: { flex: 1, fontSize: 14, color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
  weightInput: { flexDirection: 'row', gap: spacing.md },
});
