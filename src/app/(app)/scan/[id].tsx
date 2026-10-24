import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLogScan, useRemoveScanItem, useScan, useSwapFood } from '@/api/queries';
import type { MealType, ScanItem } from '@/api/types';
import { Button, Card, ChoiceGroup, Chip, ErrorText } from '@/components/ui';
import { localDate, MEAL_LABELS, mealForTime } from '@/lib/date';
import { FLAG_LABELS, forGrams, sum } from '@/lib/nutrition';
import { colors, radius, spacing } from '@/theme';

const MEAL_OPTIONS = (Object.keys(MEAL_LABELS) as MealType[]).map((m) => ({ value: m, label: MEAL_LABELS[m] }));

export default function ScanScreen() {
  const scanId = Number(useLocalSearchParams<{ id: string }>().id);
  const scan = useScan(scanId);
  const logScan = useLogScan();
  // Only grams the user changed; other items use the server's estimate.
  const [grams, setGrams] = useState<Record<number, number>>({});
  const [mealType, setMealType] = useState<MealType>(mealForTime());

  const items = useMemo(() => scan.data?.items ?? [], [scan.data]);
  const totals = useMemo(
    () => sum(items.map((item) => forGrams(item.food.per100g, grams[item.id] ?? item.grams))),
    [items, grams],
  );

  if (scan.isPending) {
    return <Analyzing />;
  }
  if (scan.error) {
    return (
      <View style={styles.centered}>
        <ErrorText error={scan.error} />
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }
  if (scan.data.status === 'processing') {
    return <Analyzing />;
  }
  if (scan.data.status === 'failed') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{"Couldn't analyze this photo"}</Text>
        <Text style={styles.muted}>{scan.data.error}</Text>
        <Button title="Try another photo" onPress={() => router.replace('/camera')} />
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const save = () =>
    logScan.mutate(
      { scan: scan.data, grams, date: localDate(), mealType },
      { onSuccess: () => router.back() },
    );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.title}>{scan.data.mealName || 'Your meal'}</Text>
          <Text style={styles.kcal}>{Math.round(totals.kcal)} kcal</Text>
          <Text style={styles.muted}>
            Protein {Math.round(totals.proteinG)} g · Carbs {Math.round(totals.carbsG)} g · Fat{' '}
            {Math.round(totals.fatG)} g
          </Text>
          {scan.data.notes ? <Text style={styles.notes}>{scan.data.notes}</Text> : null}
        </Card>

        {items.length === 0 ? (
          <Card>
            <Text style={styles.muted}>No food was found in this photo.</Text>
          </Card>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              scanId={scanId}
              item={item}
              grams={grams[item.id] ?? item.grams}
              onGramsChange={(g) => setGrams((current) => ({ ...current, [item.id]: g }))}
            />
          ))
        )}

        <ChoiceGroup label="Add to" options={MEAL_OPTIONS} value={mealType} onChange={setMealType} />
        <ErrorText error={logScan.error} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={`Log ${items.length} item${items.length === 1 ? '' : 's'}`}
          onPress={save}
          loading={logScan.isPending}
          disabled={items.length === 0}
        />
      </View>
    </View>
  );
}

function Analyzing() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>Analyzing your meal…</Text>
      <Text style={styles.muted}>Identifying foods and estimating portions. This takes a few seconds.</Text>
    </View>
  );
}

function ItemCard({
  scanId,
  item,
  grams,
  onGramsChange,
}: {
  scanId: number;
  item: ScanItem;
  grams: number;
  onGramsChange: (grams: number) => void;
}) {
  const swap = useSwapFood(scanId);
  const remove = useRemoveScanItem(scanId);
  // What the user is typing; null when not editing, so the field shows `grams`.
  const [draft, setDraft] = useState<string | null>(null);

  const nutrients = forGrams(item.food.per100g, grams);
  const step = grams >= 50 ? 10 : 5;
  const setClamped = (g: number) => onGramsChange(Math.min(5000, Math.max(1, Math.round(g))));

  return (
    <Card style={styles.item}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.muted} numberOfLines={2}>
            {item.source === 'ai' ? 'AI estimate' : item.food.name}
          </Text>
        </View>
        <Pressable
          onPress={() => remove.mutate(item.id)}
          disabled={remove.isPending}
          hitSlop={12}
          accessibilityLabel={`Remove ${item.name}`}
        >
          <Text style={styles.remove}>✕</Text>
        </Pressable>
      </View>

      {item.flags.length > 0 ? (
        <View style={styles.chips}>
          {item.flags.map((flag) => (
            <Chip key={flag} text={FLAG_LABELS[flag] ?? flag} tone={flag === 'hidden_addition' ? 'neutral' : 'warning'} />
          ))}
        </View>
      ) : null}

      <View style={styles.gramsRow}>
        <Pressable style={styles.stepper} onPress={() => setClamped(grams - step)} accessibilityLabel="Less">
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <View style={styles.gramsInputWrap}>
          <TextInput
            style={styles.gramsInput}
            value={draft ?? String(Math.round(grams))}
            onChangeText={setDraft}
            onEndEditing={() => {
              const parsed = Number(draft);
              if (draft !== null && Number.isFinite(parsed) && parsed > 0) setClamped(parsed);
              setDraft(null);
            }}
            keyboardType="number-pad"
            selectTextOnFocus
            accessibilityLabel={`Grams of ${item.name}`}
          />
          <Text style={styles.gramsUnit}>g</Text>
        </View>
        <Pressable style={styles.stepper} onPress={() => setClamped(grams + step)} accessibilityLabel="More">
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
        <Text style={styles.itemKcal}>{Math.round(nutrients.kcal)} kcal</Text>
      </View>
      <Text style={styles.muted}>
        Estimated {Math.round(item.estimatedGrams)} g (likely {Math.round(item.gramsLow)}–{Math.round(item.gramsHigh)}{' '}
        g) · P {Math.round(nutrients.proteinG)} · C {Math.round(nutrients.carbsG)} · F {Math.round(nutrients.fatG)}
      </Text>

      {item.alternatives.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.altLabel}>Not right? Switch to:</Text>
          <View style={styles.chips}>
            {item.alternatives.map((alt) => (
              <Pressable
                key={alt.id}
                onPress={() => swap.mutate({ itemId: item.id, food: alt })}
                disabled={swap.isPending}
                style={styles.alt}
              >
                <Text style={styles.altText} numberOfLines={1}>
                  {alt.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <ErrorText error={swap.error ?? remove.error} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  kcal: { fontSize: 32, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  notes: { fontSize: 13, color: colors.warningText },
  item: { gap: spacing.sm },
  itemHeader: { flexDirection: 'row', gap: spacing.md },
  itemName: { fontSize: 17, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  remove: { fontSize: 18, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: 20, color: colors.text },
  gramsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  gramsInput: { minWidth: 48, fontSize: 17, color: colors.text, textAlign: 'right', padding: 0 },
  gramsUnit: { fontSize: 15, color: colors.textMuted, marginLeft: 2 },
  itemKcal: { marginLeft: 'auto', fontSize: 17, fontWeight: '600', color: colors.text },
  altLabel: { fontSize: 13, color: colors.textMuted },
  alt: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  altText: { fontSize: 13, color: colors.primary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.background },
});
