import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { API_URL, getAccessToken, refreshSession } from '@/api/client';
import { colors, radius, shadow, spacing } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isPrimary = variant === 'primary';
  const textColor = isPrimary ? colors.primaryText : variant === 'danger' ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={20} color={textColor} /> : null}
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Round icon-only button, e.g. in headers. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'surface',
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'surface' | 'primary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'primary' ? styles.iconButtonPrimary : styles.iconButtonSurface,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={tone === 'primary' ? colors.primaryText : colors.text} />
    </Pressable>
  );
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, props.style]}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value, max, color = colors.primary }: { value: number; max: number; color?: string }) {
  const fraction = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: over ? colors.danger : color }]} />
    </View>
  );
}

/**
 * Circular progress. Goes red when over the goal; children are centred
 * inside the ring.
 */
export function Ring({
  value,
  max,
  size,
  stroke,
  color = colors.primary,
  children,
}: {
  value: number;
  max: number;
  size: number;
  stroke: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        {fraction > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={over ? colors.danger : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - fraction)}
            fill="none"
            // Start at 12 o'clock instead of 3 o'clock.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal?: number; color: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroLabel}>{label}</Text>
      <ProgressBar value={value} max={goal ?? 0} color={color} />
      <Text style={styles.macroValue}>
        {Math.round(value)}
        {goal ? ` / ${Math.round(goal)}` : ''} g
      </Text>
    </View>
  );
}

/**
 * Profile photo served by the API (it needs the bearer token), falling back
 * to initials. A failed load is retried once after refreshing the session,
 * since the access token is short-lived.
 */
export function Avatar({ url, name, size = 40 }: { url: string | null | undefined; name: string; size?: number }) {
  const [attempt, setAttempt] = useState(0);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const token = getAccessToken();
  const frame = { width: size, height: size, borderRadius: size / 2 };

  if (url && failedUrl !== url) {
    return (
      <Image
        key={`${url}#${attempt}`}
        source={{ uri: `${API_URL}${url}`, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
        style={[frame, { backgroundColor: colors.track }]}
        accessibilityLabel="Profile photo"
        onError={() => {
          if (attempt === 0) {
            void refreshSession().then(() => setAttempt(1));
          } else {
            setFailedUrl(url);
          }
        }}
      />
    );
  }
  return (
    <View style={[frame, styles.initials]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Single-choice row of options, e.g. sex, activity level or meal type. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.choices}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Chip({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'warning' }) {
  return (
    <View style={[styles.chip, tone === 'warning' && styles.chipWarning]}>
      <Text style={[styles.chipText, tone === 'warning' && styles.chipTextWarning]}>{text}</Text>
    </View>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.error}>{error instanceof Error ? error.message : String(error)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.primarySoft },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonText: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconButtonSurface: { backgroundColor: colors.surface, ...shadow },
  iconButtonPrimary: { backgroundColor: colors.primary },
  field: { gap: spacing.xs + 2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputFocused: { borderColor: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 4 },
  macro: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  macroLabel: { width: 56, fontSize: 13, color: colors.textMuted },
  macroValue: { width: 84, fontSize: 13, color: colors.text, textAlign: 'right' },
  initials: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: colors.primaryDark, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { fontSize: 14, color: colors.text },
  choiceTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.track },
  chipWarning: { backgroundColor: colors.warningBg },
  chipText: { fontSize: 12, color: colors.textMuted },
  chipTextWarning: { color: colors.warningText },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  error: { color: colors.danger, fontSize: 14, flex: 1 },
});
