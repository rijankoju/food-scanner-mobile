// Mirrors the backend's JSON responses (see food-scanner-api-server/src/main/java/com/foodscan).

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
};

export type Nutrients = {
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type Macros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type GoalMode = 'calculated' | 'custom';

export type Goal = Macros & { effectiveFrom: string; source: GoalMode };

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose_fat' | 'maintain' | 'lean_gain' | 'bulk' | 'recomp';

export type GoalWarning =
  | 'PACE_LIMITED'
  | 'FLOOR_APPLIED'
  | 'AGGRESSIVE_PACE'
  | 'LOW_CARBS'
  | 'TARGET_DIRECTION'
  | 'LOW_TARGET_BMI';

/** The calculator's suggestion and how it got there (backend GoalCalculator). */
export type Recommendation = {
  targets: Macros;
  breakdown: {
    bmr: number;
    tdee: number;
    adjustmentKcal: number;
    weeklyRateKg: number;
    proteinPerKg: number;
    proteinBasisKg: number;
    fatPercent: number;
  };
  weeksToTarget: number | null;
  targetDate: string | null;
  warnings: GoalWarning[];
};

export type Me = {
  id: number;
  email: string;
  displayName: string | null;
  /** API path of the profile photo (needs the bearer token), or null. */
  avatarUrl: string | null;
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  latestWeightKg: number | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  units: 'metric' | 'imperial';
  targetWeightKg: number | null;
  weeklyRateKg: number | null;
  goalMode: GoalMode;
  goal: Goal | null;
  recommendation: Recommendation | null;
};

export type ProfileUpdate = Partial<{
  displayName: string;
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeightKg: number;
  weeklyRateKg: number;
  goalMode: GoalMode;
}>;

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DiaryEntry = {
  id: number;
  date: string;
  mealType: MealType;
  foodId: number;
  foodName: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  scanItemId: number | null;
};

export type Meal = {
  mealType: MealType;
  totals: Macros;
  entries: DiaryEntry[];
};

export type DayView = {
  date: string;
  goal: Goal | null;
  totals: Macros;
  remaining: Macros | null;
  meals: Meal[];
};

export type Upload = {
  key: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
  requiresAuth: boolean;
};

export type FoodOption = {
  id: number;
  name: string;
  per100g: Nutrients;
};

export type ScanFlag =
  | 'low_confidence'
  | 'no_db_match'
  | 'kcal_mismatch'
  | 'large_portion'
  | 'macro_inconsistent'
  | 'hidden_addition';

export type ScanItem = {
  id: number;
  name: string;
  cookingMethod: string;
  hiddenAddition: boolean;
  grams: number;
  estimatedGrams: number;
  gramsLow: number;
  gramsHigh: number;
  confidence: number;
  source: 'db' | 'ai';
  food: FoodOption;
  nutrients: Nutrients;
  flags: ScanFlag[];
  alternatives: FoodOption[];
};

export type Scan = {
  id: number;
  status: 'processing' | 'ready' | 'failed';
  error: string | null;
  mealName: string | null;
  notes: string | null;
  createdAt: string;
  items: ScanItem[];
  totals: Nutrients;
};

export type FoodSummary = {
  id: number;
  name: string;
  dataType: string | null;
  category: string | null;
  per100g: Nutrients;
  score: number;
};

export type FoodPortion = { label: string; grams: number };

export type FoodDetail = {
  id: number;
  source: 'usda' | 'off' | 'custom' | 'ai';
  dataType: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  per100g: Nutrients;
  fiber100g: number | null;
  sugar100g: number | null;
  sodiumMg100g: number | null;
  portions: FoodPortion[];
};

export type RecentFood = {
  id: number;
  name: string;
  per100g: Nutrients;
  lastGrams: number;
};

export type DailyTotal = Macros & { date: string };

export type WeightPoint = { date: string; kg: number };
