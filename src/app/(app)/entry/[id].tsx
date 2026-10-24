import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { useDeleteEntry, useEntry, useFood, useUpdateEntry } from '@/api/queries';
import { FoodAmountForm } from '@/components/FoodAmountForm';
import { Button, ErrorText } from '@/components/ui';
import { colors, spacing } from '@/theme';

/** Change the amount or meal of a logged entry, or delete it. */
export default function EditEntryScreen() {
  const entry = useEntry(Number(useLocalSearchParams<{ id: string }>().id));
  const food = useFood(entry.data?.foodId ?? 0);
  const update = useUpdateEntry();
  const remove = useDeleteEntry();

  if (entry.error) return <ErrorText error={entry.error} />;
  if (food.error) return <ErrorText error={food.error} />;
  if (!entry.data || !food.data) return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />;

  const current = entry.data;
  const confirmDelete = () =>
    Alert.alert('Remove entry?', `${current.foodName} (${Math.round(current.grams)} g)`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => remove.mutate(current, { onSuccess: () => router.back() }),
      },
    ]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FoodAmountForm
          food={food.data}
          initialGrams={current.grams}
          initialMeal={current.mealType}
          submitLabel="Save changes"
          submitting={update.isPending}
          onSubmit={(grams, mealType) =>
            update.mutate({ entry: current, grams, mealType }, { onSuccess: () => router.back() })
          }
        >
          <ErrorText error={update.error ?? remove.error} />
        </FoodAmountForm>
        <Button title="Remove from diary" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
});
