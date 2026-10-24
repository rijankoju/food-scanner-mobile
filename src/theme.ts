import { Platform, type ViewStyle } from 'react-native';

/**
 * Neutral surfaces with color reserved for data and actions, so the calorie
 * and macro progress stands out (one accent, three macro hues).
 */
export const colors = {
  background: '#F3F5F4',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8F8',
  text: '#121614',
  textMuted: '#6B7370',
  border: '#E4E8E6',
  primary: '#17A35E',
  primaryDark: '#0E7A45',
  primarySoft: '#E6F6EE',
  primaryText: '#FFFFFF',
  danger: '#D9480F',
  dangerSoft: '#FDEBE3',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  protein: '#E5484D',
  carbs: '#F59E0B',
  fat: '#3B82F6',
  track: '#ECEFEE',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 };

export const type = {
  display: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15 },
  caption: { fontSize: 13 },
} as const;

/** Soft elevation for cards and floating buttons. */
export const shadow: ViewStyle = Platform.select({
  ios: { shadowColor: '#0B2016', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});
