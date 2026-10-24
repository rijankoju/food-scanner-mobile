import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

/** App mark plus a title, for the sign-in and sign-up screens. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Ionicons name="nutrition" size={34} color={colors.primaryText} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    transform: [{ rotate: '-6deg' }],
  },
  title: { ...type.title, fontSize: 30, color: colors.text },
  subtitle: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
});
