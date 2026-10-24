import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGoalPreview, useMe, useSetCustomGoal, useUpdateProfile } from '@/api/queries';
import type { GoalMode, GoalType, GoalWarning, Macros, Me, ProfileUpdate, Recommendation } from '@/api/types';
import { Button, Card, ChoiceGroup, Chip, ErrorText, TextField } from '@/components/ui';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { colors, radius, spacing } from '@/theme';

const GOALS: { value: GoalType; title: string; description: string }[] = [
  { value: 'lose_fat', title: 'Lose fat', description: 'Eat below your daily burn, high protein to keep muscle.' },
  { value: 'maintain', title: 'Maintain', description: 'Stay at your current weight.' },
  { value: 'recomp', title: 'Recomp', description: 'Same weight: lose fat and build muscle with high protein.' },
  { value: 'lean_gain', title: 'Lean muscle gain', description: 'Small surplus to gain slowly with less fat.' },
  { value: 'bulk', title: 'Bulk', description: 'Bigger surplus to gain faster.' },
];

/** Pace choices in kg/week; mirrors the allowed ranges in the backend GoalCalculator. */
const PACES: Partial<Record<GoalType, { rates: number[]; defaultRate: number }>> = {
  lose_fat: { rates: [0.25, 0.5, 0.75, 1.0], defaultRate: 0.5 },
  lean_gain: { rates: [0.1, 0.2, 0.25], defaultRate: 0.25 },
  bulk: { rates: [0.25, 0.4, 0.5], defaultRate: 0.4 },
};

const WARNING_TEXT: Record<GoalWarning, string> = {
  PACE_LIMITED: 'Pace slowed so your deficit stays under 25% of what you burn each day.',
  FLOOR_APPLIED: 'Calories raised to a safe minimum (1,200 for women, 1,500 for men).',
  AGGRESSIVE_PACE: 'This pace is over 1% of your body weight per week, which is hard to sustain.',
  LOW_CARBS: 'Protein and fat use up all your calories, leaving no room for carbs.',
  TARGET_DIRECTION: 'Your target weight goes the opposite way from this goal.',
  LOW_TARGET_BMI: 'That target weight is below a healthy BMI of 18.5.',
};

const MODE_OPTIONS: { value: GoalMode; label: string }[] = [
  { value: 'calculated', label: 'Use recommended' },
  { value: 'custom', label: 'Set my own' },
];

export default function GoalsScreen() {
  const me = useMe();
  if (me.isPending) return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />;
  if (me.error) {
    return (
      <View style={styles.content}>
        <ErrorText error={me.error} />
      </View>
    );
  }

  const m = me.data;
  if (!m.sex || !m.birthDate || !m.heightCm || !m.latestWeightKg || !m.activityLevel) {
    return (
      <View style={styles.content}>
        <Card>
          <Text style={styles.cardTitle}>First, tell us about you</Text>
          <Text style={styles.body}>
            Recommendations need your sex, birth date, height, weight and activity level.
          </Text>
          <Button title="Complete profile" onPress={() => router.replace('/profile')} />
        </Card>
      </View>
    );
  }
  return <GoalsForm me={m} />;
}

function GoalsForm({ me }: { me: Me }) {
  const update = useUpdateProfile();
  const setCustom = useSetCustomGoal();

  const [goalType, setGoalType] = useState<GoalType>(me.goalType ?? 'maintain');
  const [target, setTarget] = useState(me.targetWeightKg ? String(me.targetWeightKg) : '');
  const [rate, setRate] = useState<number | null>(me.weeklyRateKg);
  const [mode, setMode] = useState<GoalMode>(me.goalMode);
  const [formError, setFormError] = useState<string | null>(null);

  const startCustom = me.goal?.source === 'custom' ? me.goal : (me.recommendation?.targets ?? me.goal);
  const [custom, setCustomFields] = useState({
    kcal: startCustom ? String(startCustom.kcal) : '',
    proteinG: startCustom ? String(Math.round(startCustom.proteinG)) : '',
    carbsG: startCustom ? String(Math.round(startCustom.carbsG)) : '',
    fatG: startCustom ? String(Math.round(startCustom.fatG)) : '',
  });

  const pace = PACES[goalType];
  const targetKg = Number(target.replace(',', '.'));
  const targetValid = target === '' || (targetKg >= 20 && targetKg <= 400);

  // Only the goal settings change here; the server fills in the saved body data.
  const settings: ProfileUpdate = { goalType };
  if (pace && rate !== null) settings.weeklyRateKg = rate;
  if (pace && target !== '' && targetValid) settings.targetWeightKg = targetKg;
  // Debounce the JSON text: `settings` is a new object every render, the text only changes with the values.
  const settingsKey = useDebouncedValue(JSON.stringify(settings), 400);
  const debouncedSettings = useMemo(() => JSON.parse(settingsKey) as ProfileUpdate, [settingsKey]);
  const preview = useGoalPreview(debouncedSettings, true);
  const recommendation = preview.data ?? me.recommendation;

  const selectGoal = (goal: GoalType) => {
    setGoalType(goal);
    setRate(null); // each goal has its own pace range; start from its default
  };

  const save = async () => {
    setFormError(null);
    if (!targetValid) return setFormError('Target weight must be between 20 and 400 kg.');
    try {
      if (mode === 'calculated') {
        await update.mutateAsync({ ...settings, goalMode: 'calculated' });
      } else {
        const targets = parseCustom(custom);
        if (typeof targets === 'string') return setFormError(targets);
        await update.mutateAsync(settings);
        await setCustom.mutateAsync(targets);
      }
      router.back();
    } catch {
      // shown via the mutation error below
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Your goal</Text>
        <View style={styles.goals}>
          {GOALS.map((goal) => {
            const selected = goal.value === goalType;
            return (
              <Pressable
                key={goal.value}
                onPress={() => selectGoal(goal.value)}
                style={[styles.goal, selected && styles.goalSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.goalTitle, selected && styles.goalTitleSelected]}>{goal.title}</Text>
                <Text style={styles.muted}>{goal.description}</Text>
              </Pressable>
            );
          })}
        </View>

        {pace ? (
          <>
            <TextField
              label={`Target weight (kg) · now ${me.latestWeightKg} kg`}
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              placeholder="optional"
            />
            <ChoiceGroup
              label={goalType === 'lose_fat' ? 'Pace (lose per week)' : 'Pace (gain per week)'}
              options={pace.rates.map((r) => ({ value: String(r), label: `${r} kg` }))}
              value={String(rate ?? pace.defaultRate)}
              onChange={(r) => setRate(Number(r))}
            />
          </>
        ) : null}

        <RecommendationCard
          recommendation={recommendation}
          loading={preview.isFetching}
          error={preview.error}
          targetKg={pace && target !== '' && targetValid ? targetKg : null}
        />

        <ChoiceGroup label="Daily targets" options={MODE_OPTIONS} value={mode} onChange={setMode} />
        {mode === 'custom' ? (
          <CustomTargets
            values={custom}
            onChange={setCustomFields}
            onUseRecommended={
              recommendation
                ? () =>
                    setCustomFields({
                      kcal: String(recommendation.targets.kcal),
                      proteinG: String(Math.round(recommendation.targets.proteinG)),
                      carbsG: String(Math.round(recommendation.targets.carbsG)),
                      fatG: String(Math.round(recommendation.targets.fatG)),
                    })
                : undefined
            }
          />
        ) : null}

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <ErrorText error={update.error ?? setCustom.error} />
        <Button title="Save goals" onPress={save} loading={update.isPending || setCustom.isPending} />
        <Text style={styles.disclaimer}>
          General fitness guidance, not medical advice. If you are pregnant, under 18 or have a medical
          condition, check with a doctor or dietitian first.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RecommendationCard({
  recommendation,
  loading,
  error,
  targetKg,
}: {
  recommendation: Recommendation | null | undefined;
  loading: boolean;
  error: unknown;
  targetKg: number | null;
}) {
  if (!recommendation) {
    return (
      <Card>
        {error ? <ErrorText error={error} /> : <ActivityIndicator color={colors.primary} />}
      </Card>
    );
  }
  const { targets, breakdown: b } = recommendation;
  const adjustment =
    b.adjustmentKcal < -5
      ? `${b.adjustmentKcal.toLocaleString()} kcal to lose about ${b.weeklyRateKg} kg/week`
      : b.adjustmentKcal > 5
        ? `+${b.adjustmentKcal.toLocaleString()} kcal to gain about ${b.weeklyRateKg} kg/week`
        : 'No adjustment: eat what you burn';

  return (
    <Card style={{ opacity: loading ? 0.6 : 1 }}>
      <Text style={styles.cardTitle}>Recommended per day</Text>
      <Text style={styles.kcal}>{targets.kcal.toLocaleString()} kcal</Text>
      <Text style={styles.body}>
        Protein {Math.round(targets.proteinG)} g · Carbs {Math.round(targets.carbsG)} g · Fat{' '}
        {Math.round(targets.fatG)} g
      </Text>

      {recommendation.weeksToTarget && recommendation.targetDate && targetKg ? (
        <Text style={styles.eta}>
          Reach {targetKg} kg in about {recommendation.weeksToTarget} weeks (around{' '}
          {formatDate(recommendation.targetDate)})
        </Text>
      ) : null}

      <View style={styles.why}>
        <Text style={styles.whyTitle}>Why these numbers</Text>
        <WhyRow label="Burned at rest (BMR)" value={`${b.bmr.toLocaleString()} kcal`} />
        <WhyRow label="Burned per day with activity" value={`${b.tdee.toLocaleString()} kcal`} />
        <WhyRow label="Goal adjustment" value={adjustment} />
        <WhyRow label="Protein" value={`${b.proteinPerKg} g per kg × ${b.proteinBasisKg} kg`} />
        <WhyRow label="Fat" value={`${b.fatPercent}% of calories`} />
        <WhyRow label="Carbs" value="the rest of your calories" />
      </View>

      {recommendation.warnings.length > 0 ? (
        <View style={styles.warnings}>
          {recommendation.warnings.map((w) => (
            <Chip key={w} text={WARNING_TEXT[w] ?? w} tone="warning" />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function WhyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.whyRow}>
      <Text style={styles.whyLabel}>{label}</Text>
      <Text style={styles.whyValue}>{value}</Text>
    </View>
  );
}

type CustomFields = { kcal: string; proteinG: string; carbsG: string; fatG: string };

function CustomTargets({
  values,
  onChange,
  onUseRecommended,
}: {
  values: CustomFields;
  onChange: (values: CustomFields) => void;
  onUseRecommended?: () => void;
}) {
  const n = (v: string) => Number(v.replace(',', '.')) || 0;
  const kcal = n(values.kcal);
  const macroKcal = 4 * n(values.proteinG) + 4 * n(values.carbsG) + 9 * n(values.fatG);
  const pct = (grams: number, perGram: number) => (macroKcal > 0 ? Math.round(((grams * perGram) / macroKcal) * 100) : 0);
  const offBy = kcal > 0 ? Math.abs(macroKcal - kcal) / kcal : 0;

  const field = (key: keyof CustomFields, label: string) => (
    <View style={{ flex: 1 }}>
      <TextField
        label={label}
        value={values[key]}
        onChangeText={(text) => onChange({ ...values, [key]: text })}
        keyboardType="number-pad"
      />
    </View>
  );

  return (
    <Card>
      {field('kcal', 'Calories (kcal)')}
      <View style={styles.row}>
        {field('proteinG', 'Protein (g)')}
        {field('carbsG', 'Carbs (g)')}
        {field('fatG', 'Fat (g)')}
      </View>
      <Text style={styles.muted}>
        Macros add up to {Math.round(macroKcal).toLocaleString()} kcal · protein {pct(n(values.proteinG), 4)}% · carbs{' '}
        {pct(n(values.carbsG), 4)}% · fat {pct(n(values.fatG), 9)}%
      </Text>
      {kcal > 0 && offBy > 0.1 ? (
        <Chip text="Your macros don't add up to your calorie target (more than 10% off)." tone="warning" />
      ) : null}
      {onUseRecommended ? (
        <Button title="Start from recommended" variant="secondary" onPress={onUseRecommended} />
      ) : null}
    </Card>
  );
}

/** Same limits as the backend's PUT /api/me/goals. Returns an error message when invalid. */
function parseCustom(values: CustomFields): Macros | string {
  const kcal = Number(values.kcal);
  const proteinG = Number(values.proteinG);
  const carbsG = Number(values.carbsG);
  const fatG = Number(values.fatG);
  if (!(kcal >= 800 && kcal <= 10000)) return 'Calories must be between 800 and 10,000.';
  if (!(proteinG >= 0 && proteinG <= 600)) return 'Protein must be between 0 and 600 g.';
  if (!(carbsG >= 0 && carbsG <= 1500)) return 'Carbs must be between 0 and 1,500 g.';
  if (!(fatG >= 0 && fatG <= 600)) return 'Fat must be between 0 and 600 g.';
  return { kcal: Math.round(kcal), proteinG, carbsG, fatG };
}

function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  section: { fontSize: 17, fontWeight: '600', color: colors.text },
  goals: { gap: spacing.sm },
  goal: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  goalSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  goalTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  goalTitleSelected: { color: colors.primary },
  cardTitle: { fontSize: 14, color: colors.textMuted },
  kcal: { fontSize: 32, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  eta: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  why: { gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md },
  whyTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  whyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  whyLabel: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  whyValue: { fontSize: 13, color: colors.text, textAlign: 'right', flexShrink: 1 },
  warnings: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
