import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMe, useRemoveAvatar, useSetAvatar, useUpdateProfile } from '@/api/queries';
import type { ActivityLevel, Me, ProfileUpdate, Sex } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar, Button, Card, ChoiceGroup, ErrorText, TextField } from '@/components/ui';
import { colors, radius, shadow, spacing, type } from '@/theme';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Mostly sitting' },
  { value: 'light', label: 'Light (1-3 workouts/wk)' },
  { value: 'moderate', label: 'Moderate (3-5/wk)' },
  { value: 'active', label: 'Active (6-7/wk)' },
  { value: 'very_active', label: 'Very active / physical job' },
];

export default function ProfileScreen() {
  const me = useMe();
  if (me.isPending) {
    return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />;
  }
  if (me.error) {
    return (
      <View style={styles.content}>
        <ErrorText error={me.error} />
      </View>
    );
  }
  return <ProfileForm me={me.data} />;
}

/** Starts from the loaded profile; edits stay local until saved. */
function ProfileForm({ me }: { me: Me }) {
  const { signOut } = useAuth();
  const update = useUpdateProfile();

  const [name, setName] = useState(me.displayName ?? '');
  const [sex, setSex] = useState<Sex | null>(me.sex);
  const [birthDate, setBirthDate] = useState(me.birthDate ?? '');
  const [height, setHeight] = useState(me.heightCm ? String(me.heightCm) : '');
  const [weight, setWeight] = useState(me.latestWeightKg ? String(me.latestWeightKg) : '');
  const [activity, setActivity] = useState<ActivityLevel | null>(me.activityLevel);
  const [formError, setFormError] = useState<string | null>(null);

  const save = () => {
    setFormError(null);
    const body: ProfileUpdate = {};
    if (name.trim()) body.displayName = name.trim();
    if (sex) body.sex = sex;
    if (birthDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return setFormError('Birth date must look like 1995-03-10.');
      body.birthDate = birthDate;
    }
    if (height) {
      const h = Number(height);
      if (!(h >= 50 && h <= 272)) return setFormError('Height must be between 50 and 272 cm.');
      body.heightCm = h;
    }
    if (weight) {
      const w = Number(weight);
      if (!(w >= 20 && w <= 400)) return setFormError('Weight must be between 20 and 400 kg.');
      if (w !== me.latestWeightKg) body.weightKg = w;
    }
    if (activity) body.activityLevel = activity;
    update.mutate(body);
  };

  const goal = update.data?.goal ?? me.goal;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoHeader me={me} />

        <Pressable onPress={() => router.push('/goals')} accessibilityRole="button">
          <Card style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalIcon}>
                <Ionicons name="flag" size={18} color={colors.primaryDark} />
              </View>
              <Text style={styles.cardTitle}>{goal?.source === 'custom' ? 'Daily goal (custom)' : 'Daily goal'}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
            {goal ? (
              <View style={styles.goalNumbers}>
                <Text style={styles.goalKcal}>
                  {goal.kcal} <Text style={styles.goalUnit}>kcal</Text>
                </Text>
                <View style={styles.goalMacros}>
                  <MacroPill label="P" grams={goal.proteinG} color={colors.protein} />
                  <MacroPill label="C" grams={goal.carbsG} color={colors.carbs} />
                  <MacroPill label="F" grams={goal.fatG} color={colors.fat} />
                </View>
              </View>
            ) : (
              <Text style={styles.muted}>Fill in the details below, then choose your goal.</Text>
            )}
          </Card>
        </Pressable>

        <Text style={styles.section}>About you</Text>
        <Card>
          <TextField label="Name" value={name} onChangeText={setName} />
          <ChoiceGroup label="Sex (for the calorie formula)" options={SEX_OPTIONS} value={sex} onChange={setSex} />
          <TextField
            label="Birth date (YYYY-MM-DD)"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="1995-03-10"
            keyboardType="numbers-and-punctuation"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            </View>
          </View>
          <ChoiceGroup label="Activity" options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
        </Card>

        {formError ? <ErrorText error={formError} /> : null}
        <ErrorText error={update.error} />
        {update.isSuccess ? (
          <View style={styles.saved}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.savedText}>Saved</Text>
          </View>
        ) : null}
        <Button title="Save changes" onPress={save} loading={update.isPending} />

        <Button title="Sign out" icon="log-out-outline" variant="danger" onPress={signOut} style={styles.signOut} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Photo, name and email, with a menu to take, choose or remove the photo. */
function PhotoHeader({ me }: { me: Me }) {
  const setAvatar = useSetAvatar();
  const removeAvatar = useRemoveAvatar();
  const busy = setAvatar.isPending || removeAvatar.isPending;

  const pick = async (source: 'camera' | 'library') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    };
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Allow camera access in Settings to take a profile photo.');
        return;
      }
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatar.mutate({ uri: asset.uri, width: asset.width, height: asset.height });
    }
  };

  const openMenu = () =>
    Alert.alert('Profile photo', undefined, [
      { text: 'Take photo', onPress: () => void pick('camera') },
      { text: 'Choose from library', onPress: () => void pick('library') },
      ...(me.avatarUrl
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => removeAvatar.mutate() }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  return (
    <View style={styles.photoHeader}>
      <Pressable
        onPress={openMenu}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        <Avatar url={me.avatarUrl} name={me.displayName || me.email} size={104} />
        <View style={styles.cameraBadge}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Ionicons name="camera" size={16} color={colors.primaryText} />
          )}
        </View>
      </Pressable>
      <Text style={styles.name}>{me.displayName || 'Your profile'}</Text>
      <Text style={styles.muted}>{me.email}</Text>
      <ErrorText error={setAvatar.error ?? removeAvatar.error} />
    </View>
  );
}

function MacroPill({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={styles.pillText}>
        {label} {Math.round(grams)} g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  photoHeader: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  name: { ...type.heading, fontSize: 22, color: colors.text, marginTop: spacing.sm },
  goalCard: { gap: spacing.md },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  goalNumbers: { gap: spacing.sm },
  goalKcal: { fontSize: 30, fontWeight: '800', color: colors.text },
  goalUnit: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  goalMacros: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.text },
  section: { ...type.heading, color: colors.text, marginTop: spacing.sm },
  muted: { fontSize: 14, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.md },
  saved: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center' },
  savedText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  signOut: { marginTop: spacing.lg },
});
