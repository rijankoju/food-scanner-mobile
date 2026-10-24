import type { MealType } from '@/api/types';

/** The phone's local calendar date as YYYY-MM-DD; the diary is keyed by local date. */
export function localDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
}

export function formatDay(isoDate: string): string {
  const today = localDate();
  if (isoDate === today) return 'Today';
  if (isoDate === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** A sensible default meal for "now". */
export function mealForTime(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};
