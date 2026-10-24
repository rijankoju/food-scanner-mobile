import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFoodSearch, useRecentFoods } from '@/api/queries';
import type { MealType, Nutrients } from '@/api/types';
import { ErrorText } from '@/components/ui';
import { localDate, mealForTime } from '@/lib/date';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { colors, radius, spacing } from '@/theme';

type Row = { id: number; name: string; per100g: Nutrients; detail: string; grams?: number };

/** Search the food database, or pick something logged recently. */
export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? localDate();
  const meal = params.meal ?? mealForTime();

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const searching = q.length >= 2;

  const search = useFoodSearch(q);
  const recent = useRecentFoods();

  const rows: Row[] = searching
    ? (search.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        per100g: f.per100g,
        detail: `${Math.round(f.per100g.kcal ?? 0)} kcal / 100 g`,
      }))
    : (recent.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        per100g: f.per100g,
        grams: f.lastGrams,
        detail: `Last time ${Math.round(f.lastGrams)} g · ${Math.round(((f.per100g.kcal ?? 0) * f.lastGrams) / 100)} kcal`,
      }));

  const open = (row: Row) =>
    router.push({
      pathname: '/food/[id]',
      params: { id: String(row.id), date, meal, ...(row.grams ? { grams: String(row.grams) } : {}) },
    });

  const loading = searching ? search.isFetching : recent.isPending;

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search foods, e.g. banana, white rice"
        placeholderTextColor={colors.textMuted}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <Text style={styles.sectionTitle}>{searching ? 'Results' : 'Recent'}</Text>
      <ErrorText error={searching ? search.error : recent.error} />
      <FlatList
        data={rows}
        keyExtractor={(row) => String(row.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} onPress={() => open(item)}>
            <Text style={styles.rowName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.rowDetail}>{item.detail}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : (
            <Text style={styles.empty}>
              {searching ? `No foods found for "${q}".` : 'Foods you log will show up here for quick re-adding.'}
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.sm },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: spacing.sm },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
  },
  rowName: { fontSize: 16, color: colors.text },
  rowDetail: { fontSize: 13, color: colors.textMuted },
  empty: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
});
