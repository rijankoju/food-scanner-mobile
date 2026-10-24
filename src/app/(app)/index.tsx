import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDay, useDeleteEntry, useMe } from '@/api/queries';
import type { DiaryEntry, MealType } from '@/api/types';
import { Avatar, Button, Card, ErrorText, IconButton, Ring, type IconName } from '@/components/ui';
import { addDays, formatDay, localDate, MEAL_LABELS } from '@/lib/date';
import { colors, radius, shadow, spacing, type } from '@/theme';

const MEAL_ICONS: Record<MealType, { icon: IconName; tint: string; bg: string }> = {
  breakfast: { icon: 'sunny', tint: '#D97706', bg: '#FEF3C7' },
  lunch: { icon: 'restaurant', tint: '#17A35E', bg: '#E6F6EE' },
  dinner: { icon: 'moon', tint: '#6366F1', bg: '#EEF0FF' },
  snack: { icon: 'cafe', tint: '#DB2777', bg: '#FCE7F3' },
};

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const [date, setDate] = useState(localDate());
  const me = useMe();
  const day = useDay(date);
  const deleteEntry = useDeleteEntry();

  const goal = day.data?.goal;
  const totals = day.data?.totals;
  const name = me.data?.displayName || me.data?.email || '';

  const confirmDelete = (entry: DiaryEntry) =>
    Alert.alert('Remove entry?', `${entry.foodName} (${Math.round(entry.grams)} g)`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteEntry.mutate(entry) },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={day.isRefetching} onRefresh={() => void day.refetch()} />}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            style={styles.headerLeft}
          >
            <Avatar url={me.data?.avatarUrl} name={name} size={44} />
            <View>
              <Text style={styles.greeting}>
                {greeting()}
                {me.data?.displayName ? `, ${me.data.displayName}` : ''}
              </Text>
              <Text style={styles.title}>{formatDay(date)}</Text>
            </View>
          </Pressable>
          <IconButton icon="stats-chart" label="Progress" onPress={() => router.push('/progress')} />
        </View>

        <WeekStrip date={date} onChange={setDate} />

        <ErrorText error={day.error} />

        <Card style={styles.summary}>
          {goal ? (
            <>
              <Ring value={totals?.kcal ?? 0} max={goal.kcal} size={196} stroke={16}>
                <Text style={styles.kcalBig}>{Math.abs(Math.round(day.data!.remaining!.kcal))}</Text>
                <Text style={styles.muted}>{day.data!.remaining!.kcal >= 0 ? 'kcal left' : 'kcal over'}</Text>
              </Ring>
              <View style={styles.statRow}>
                <Stat label="Eaten" value={Math.round(totals?.kcal ?? 0)} />
                <View style={styles.statDivider} />
                <Stat label="Goal" value={goal.kcal} />
              </View>
            </>
          ) : (
            <View style={styles.noGoal}>
              <Ring value={0} max={0} size={120} stroke={12}>
                <Text style={styles.kcalMid}>{Math.round(totals?.kcal ?? 0)}</Text>
                <Text style={styles.muted}>kcal</Text>
              </Ring>
              <Text style={styles.noGoalText}>Set a goal to see how much you have left each day.</Text>
              <Button title="Set up goals" icon="flag" variant="secondary" onPress={() => router.push('/goals')} />
            </View>
          )}
        </Card>

        <View style={styles.macros}>
          <Macro label="Protein" value={totals?.proteinG ?? 0} goal={goal?.proteinG} color={colors.protein} />
          <Macro label="Carbs" value={totals?.carbsG ?? 0} goal={goal?.carbsG} color={colors.carbs} />
          <Macro label="Fat" value={totals?.fatG ?? 0} goal={goal?.fatG} color={colors.fat} />
        </View>

        <Text style={styles.section}>Meals</Text>
        {day.data?.meals.map((meal) => {
          const style = MEAL_ICONS[meal.mealType];
          return (
            <Card key={meal.mealType} style={styles.meal}>
              <View style={styles.mealHeader}>
                <View style={[styles.mealIcon, { backgroundColor: style.bg }]}>
                  <Ionicons name={style.icon} size={20} color={style.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTitle}>{MEAL_LABELS[meal.mealType]}</Text>
                  <Text style={styles.muted}>
                    {meal.entries.length === 0 ? 'Nothing logged yet' : `${Math.round(meal.totals.kcal)} kcal`}
                  </Text>
                </View>
                <IconButton
                  icon="add"
                  tone="primary"
                  label={`Add food to ${MEAL_LABELS[meal.mealType]}`}
                  onPress={() => router.push({ pathname: '/add', params: { date, meal: meal.mealType } })}
                />
              </View>
              {meal.entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => router.push({ pathname: '/entry/[id]', params: { id: String(entry.id) } })}
                  onLongPress={() => confirmDelete(entry)}
                  style={({ pressed }) => [styles.entry, pressed && { opacity: 0.6 }]}
                  accessibilityHint="Tap to edit, long press to remove"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryName} numberOfLines={1}>
                      {entry.foodName}
                    </Text>
                    <Text style={styles.muted}>
                      {Math.round(entry.grams)} g · P {Math.round(entry.proteinG)} · C {Math.round(entry.carbsG)} · F{' '}
                      {Math.round(entry.fatG)}
                    </Text>
                  </View>
                  <Text style={styles.entryKcal}>{Math.round(entry.kcal)}</Text>
                </Pressable>
              ))}
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push('/camera')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <Ionicons name="scan" size={22} color={colors.primaryText} />
          <Text style={styles.fabText}>Scan a meal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/** The 7 days ending today (or a few days after the selected day, for older dates). */
function WeekStrip({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const today = localDate();
  const end = addDays(date, 3) < today ? addDays(date, 3) : today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  return (
    <View style={styles.week}>
      {days.map((d) => {
        const [y, m, dd] = d.split('-').map(Number);
        const selected = d === date;
        return (
          <Pressable
            key={d}
            onPress={() => onChange(d)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={formatDay(d)}
            style={[styles.day, selected && styles.daySelected]}
          >
            <Text style={[styles.dayName, selected && styles.dayTextSelected]}>
              {new Date(y, m - 1, dd).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </Text>
            <Text style={[styles.dayNum, selected && styles.dayTextSelected]}>{dd}</Text>
            <View style={[styles.todayDot, d === today && { backgroundColor: selected ? '#fff' : colors.primary }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal?: number; color: string }) {
  return (
    <View style={styles.macroCard}>
      <Ring value={value} max={goal ?? 0} size={68} stroke={7} color={color}>
        <Text style={styles.macroValue}>{Math.round(value)}</Text>
      </Ring>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.muted}>{goal ? `of ${Math.round(goal)} g` : 'g'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  greeting: { fontSize: 14, color: colors.textMuted },
  title: { ...type.title, color: colors.text },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 44,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
  },
  daySelected: { backgroundColor: colors.primary },
  dayName: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 16, color: colors.text, fontWeight: '700' },
  dayTextSelected: { color: colors.primaryText },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  summary: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.lg },
  kcalBig: { ...type.display, color: colors.text },
  kcalMid: { fontSize: 26, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  statRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  noGoal: { alignItems: 'center', gap: spacing.md },
  noGoalText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  macros: { flexDirection: 'row', gap: spacing.md },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadow,
  },
  macroValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  macroLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
  section: { ...type.heading, color: colors.text, marginTop: spacing.sm },
  meal: { gap: spacing.sm },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mealIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  entryName: { fontSize: 15, fontWeight: '500', color: colors.text },
  entryKcal: { fontSize: 15, fontWeight: '700', color: colors.text, marginLeft: spacing.md },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.xl, alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.xl + 4,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
});
