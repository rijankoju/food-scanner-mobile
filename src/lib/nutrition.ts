import type { Macros, Nutrients, ScanFlag } from '@/api/types';

/** Nutrients for `grams` of a food, from its per-100 g values (same math as the backend). */
export function forGrams(per100g: Nutrients, grams: number): Macros {
  const scale = (v: number | null) => Math.round(((v ?? 0) * grams) / 10) / 10;
  return {
    kcal: scale(per100g.kcal),
    proteinG: scale(per100g.proteinG),
    carbsG: scale(per100g.carbsG),
    fatG: scale(per100g.fatG),
  };
}

export function sum(list: Macros[]): Macros {
  const total = list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  const r = (v: number) => Math.round(v * 10) / 10;
  return { kcal: r(total.kcal), proteinG: r(total.proteinG), carbsG: r(total.carbsG), fatG: r(total.fatG) };
}

/** User-facing wording for scan warnings. */
export const FLAG_LABELS: Record<ScanFlag, string> = {
  low_confidence: 'Not sure this is right',
  no_db_match: 'AI estimate, not in database',
  kcal_mismatch: 'Check the match',
  large_portion: 'Very large portion',
  macro_inconsistent: 'Numbers look off',
  hidden_addition: 'Likely added, not visible',
};
