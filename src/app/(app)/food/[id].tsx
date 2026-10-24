import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { useAddEntry, useFood } from '@/api/queries';
import type { MealType } from '@/api/types';
import { FoodAmountForm } from '@/components/FoodAmountForm';
import { ErrorText } from '@/components/ui';
import { localDate, mealForTime } from '@/lib/date';
import { colors, spacing } from '@/theme';

/** Choose an amount of one food and add it to the diary. */
export default function AddFoodAmountScreen() {
  const params = useLocalSearchParams<{ id: string; date?: string; meal?: MealType; grams?: string }>();
  const food = useFood(Number(params.id));
  const add = useAddEntry();
  const date = params.date ?? localDate();

  if (food.isPending) return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />;
  if (food.error) return <ErrorText error={food.error} />;

  // Default to the amount used last time, else a typical portion, else 100 g.
  const initialGrams = Number(params.grams) || food.data.portions[0]?.grams || 100;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FoodAmountForm
          food={food.data}
          initialGrams={initialGrams}
          initialMeal={params.meal ?? mealForTime()}
          submitLabel="Add to diary"
          submitting={add.isPending}
          onSubmit={(grams, mealType) =>
            add.mutate(
              { date, mealType, foodId: food.data.id, grams },
              // Back past the search screen to the diary.
              { onSuccess: () => router.dismissTo('/') },
            )
          }
        >
          <ErrorText error={add.error} />
        </FoodAmountForm>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
});
