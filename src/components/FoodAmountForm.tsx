import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { FoodDetail, MealType } from '@/api/types';
import { Button, Card, ChoiceGroup } from '@/components/ui';
import { MEAL_LABELS } from '@/lib/date';
import { forGrams } from '@/lib/nutrition';
import { colors, radius, spacing } from '@/theme';

const MEAL_OPTIONS = (Object.keys(MEAL_LABELS) as MealType[]).map((m) => ({ value: m, label: MEAL_LABELS[m] }));

/** "g" plus the food's household measures; amount = quantity x grams per unit. */
type Unit = { label: string; grams: number };

/**
 * Pick how much of a food (in grams or a household measure like "1 cup") and
 * which meal, with live nutrition. Used both to add and to edit an entry.
 */
export function FoodAmountForm({
  food,
  initialGrams,
  initialMeal,
  submitLabel,
  submitting,
  onSubmit,
  children,
}: {
  food: FoodDetail;
  initialGrams: number;
  initialMeal: MealType;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (grams: number, mealType: MealType) => void;
  children?: React.ReactNode;
}) {
  const units: Unit[] = [{ label: 'g', grams: 1 }, ...food.portions.slice(0, 6)];
  const [unitIndex, setUnitIndex] = useState(0);
  const [quantity, setQuantity] = useState(String(Math.round(initialGrams)));
  const [mealType, setMealType] = useState<MealType>(initialMeal);

  const parsed = Number(quantity.replace(',', '.'));
  const grams = Number.isFinite(parsed) && parsed > 0 ? parsed * units[unitIndex].grams : 0;
  const nutrients = forGrams(food.per100g, grams);
  const valid = grams > 0 && grams <= 5000;

  // Switching unit keeps roughly the same amount, e.g. 244 g -> 1 cup.
  const selectUnit = (index: number) => {
    const next = units[index];
    const converted = grams > 0 ? grams / next.grams : 1;
    setQuantity(index === 0 ? String(Math.round(converted)) : String(Math.round(converted * 4) / 4 || 1));
    setUnitIndex(index);
  };

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.name}>{food.name}</Text>
        {food.brand ? <Text style={styles.muted}>{food.brand}</Text> : null}
        {food.source === 'ai' ? <Text style={styles.muted}>AI estimate (not from the food database)</Text> : null}
        <View style={styles.macros}>
          <Stat label="kcal" value={nutrients.kcal} big />
          <Stat label="protein" value={nutrients.proteinG} unit="g" />
          <Stat label="carbs" value={nutrients.carbsG} unit="g" />
          <Stat label="fat" value={nutrients.fatG} unit="g" />
        </View>
        <Text style={styles.muted}>
          Per 100 g: {Math.round(food.per100g.kcal ?? 0)} kcal · P {food.per100g.proteinG ?? '–'} · C{' '}
          {food.per100g.carbsG ?? '–'} · F {food.per100g.fatG ?? '–'}
        </Text>
      </Card>

      <View style={styles.amountRow}>
        <TextInput
          style={styles.quantity}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel="Quantity"
        />
        <Text style={styles.unitLabel} numberOfLines={1}>
          {units[unitIndex].label === 'g' ? 'grams' : `× ${units[unitIndex].label}`}
        </Text>
      </View>
      {unitIndex > 0 && valid ? <Text style={styles.muted}>= {Math.round(grams)} g</Text> : null}

      <View style={styles.units}>
        {units.map((unit, index) => (
          <Pressable
            key={`${unit.label}-${index}`}
            onPress={() => selectUnit(index)}
            style={[styles.unit, index === unitIndex && styles.unitSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected: index === unitIndex }}
          >
            <Text style={[styles.unitText, index === unitIndex && styles.unitTextSelected]} numberOfLines={1}>
              {unit.label === 'g' ? 'grams' : `${unit.label} (${Math.round(unit.grams)} g)`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ChoiceGroup label="Meal" options={MEAL_OPTIONS} value={mealType} onChange={setMealType} />

      {children}

      <Button
        title={submitLabel}
        onPress={() => onSubmit(Math.round(grams * 10) / 10, mealType)}
        loading={submitting}
        disabled={!valid}
      />
    </View>
  );
}

function Stat({ label, value, unit = '', big = false }: { label: string; value: number; unit?: string; big?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={big ? styles.statBig : styles.statValue}>
        {Math.round(value)}
        {unit}
      </Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  name: { fontSize: 18, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  macros: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  stat: { alignItems: 'center' },
  statBig: { fontSize: 28, fontWeight: '700', color: colors.text },
  statValue: { fontSize: 18, fontWeight: '600', color: colors.text },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quantity: {
    width: 110,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    fontSize: 22,
    textAlign: 'center',
    color: colors.text,
  },
  unitLabel: { flex: 1, fontSize: 17, color: colors.text },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  unit: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: '100%',
  },
  unitSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  unitText: { fontSize: 14, color: colors.text },
  unitTextSelected: { color: colors.primary, fontWeight: '600' },
});
