import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { uploadAvatar } from '@/lib/scanUpload';

import { api } from './client';
import type {
  DailyTotal,
  DayView,
  DiaryEntry,
  FoodDetail,
  FoodOption,
  FoodSummary,
  Goal,
  Macros,
  MealType,
  Me,
  ProfileUpdate,
  RecentFood,
  Recommendation,
  Scan,
  ScanItem,
  WeightPoint,
} from './types';

export const queryKeys = {
  me: ['me'] as const,
  day: (date: string) => ['day', date] as const,
  scan: (id: number) => ['scan', id] as const,
  foodSearch: (q: string) => ['foods', 'search', q] as const,
  food: (id: number) => ['foods', id] as const,
  recentFoods: ['recentFoods'] as const,
  entry: (id: number) => ['entry', id] as const,
  stats: (from: string, to: string) => ['stats', from, to] as const,
  weights: (from: string, to: string) => ['weights', from, to] as const,
};

/** After any diary change: that day, recent foods and progress charts may all be stale. */
function invalidateDiary(client: ReturnType<typeof useQueryClient>, ...dates: string[]) {
  for (const date of dates) client.invalidateQueries({ queryKey: queryKeys.day(date) });
  client.invalidateQueries({ queryKey: queryKeys.recentFoods });
  client.invalidateQueries({ queryKey: ['stats'] });
}

export function useFoodSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.foodSearch(q),
    queryFn: () => api<FoodSummary[]>(`/api/foods/search?q=${encodeURIComponent(q)}&limit=25`),
    enabled: q.length >= 2,
    staleTime: 5 * 60_000,
  });
}

export function useFood(id: number) {
  return useQuery({
    queryKey: queryKeys.food(id),
    queryFn: () => api<FoodDetail>(`/api/foods/${id}`),
    enabled: id > 0,
    staleTime: Infinity,
  });
}

export function useRecentFoods() {
  return useQuery({ queryKey: queryKeys.recentFoods, queryFn: () => api<RecentFood[]>('/api/diary/recent-foods') });
}

export function useEntry(id: number) {
  return useQuery({ queryKey: queryKeys.entry(id), queryFn: () => api<DiaryEntry>(`/api/diary/entries/${id}`) });
}

export function useAddEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entry: { date: string; mealType: MealType; foodId: number; grams: number }) =>
      api<DiaryEntry>('/api/diary/entries', { method: 'POST', body: entry }),
    onSuccess: (entry) => invalidateDiary(client, entry.date),
  });
}

export function useUpdateEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ entry, ...changes }: { entry: DiaryEntry; grams?: number; mealType?: MealType; date?: string }) =>
      api<DiaryEntry>(`/api/diary/entries/${entry.id}`, { method: 'PUT', body: changes }),
    onSuccess: (updated, { entry }) => {
      client.setQueryData(queryKeys.entry(updated.id), updated);
      invalidateDiary(client, entry.date, updated.date);
    },
  });
}

export function useStats(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.stats(from, to),
    queryFn: () => api<DailyTotal[]>(`/api/stats?from=${from}&to=${to}`),
    // Keep showing the previous week while the next one loads, instead of a blank chart.
    placeholderData: keepPreviousData,
  });
}

export function useWeights(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.weights(from, to),
    queryFn: () => api<WeightPoint[]>(`/api/weights?from=${from}&to=${to}`),
  });
}

export function useLogWeight() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (point: WeightPoint) => api<WeightPoint>('/api/weights', { method: 'POST', body: point }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['weights'] });
      client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => api<Me>('/api/me') });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (update: ProfileUpdate) => api<Me>('/api/me', { method: 'PUT', body: update }),
    onSuccess: (me) => {
      client.setQueryData(queryKeys.me, me);
      // The goal may have changed, which changes every day's "remaining".
      client.invalidateQueries({ queryKey: ['day'] });
    },
  });
}

/** Uploads a picked photo and makes it the profile photo. */
export function useSetAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photo: { uri: string; width: number; height: number }) => uploadAvatar(photo),
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
  });
}

export function useRemoveAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<Me>('/api/me/avatar', { method: 'DELETE' }),
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
  });
}

/**
 * The recommendation for unsaved goal settings; the server merges them over
 * the saved profile and stores nothing. Pass an already-debounced form.
 */
export function useGoalPreview(form: ProfileUpdate, enabled: boolean) {
  return useQuery({
    queryKey: ['goalPreview', form],
    queryFn: () => api<Recommendation>('/api/me/goals/preview', { method: 'POST', body: form }),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/** Saves the user's own targets and switches goals to custom mode. */
export function useSetCustomGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (targets: Macros) => api<Goal>('/api/me/goals', { method: 'PUT', body: targets }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.me });
      client.invalidateQueries({ queryKey: ['day'] });
    },
  });
}

export function useDay(date: string) {
  return useQuery({
    queryKey: queryKeys.day(date),
    queryFn: () => api<DayView>(`/api/diary?date=${date}`),
  });
}

export function useDeleteEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entry: DiaryEntry) => api<void>(`/api/diary/entries/${entry.id}`, { method: 'DELETE' }),
    onSuccess: (_, entry) => invalidateDiary(client, entry.date),
  });
}

/** Polls while the backend is still analyzing the photo. */
export function useScan(id: number) {
  return useQuery({
    queryKey: queryKeys.scan(id),
    queryFn: () => api<Scan>(`/api/scans/${id}`),
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 1000 : false),
  });
}

export function useSwapFood(scanId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, food }: { itemId: number; food: FoodOption }) =>
      api<ScanItem>(`/api/scans/${scanId}/items/${itemId}`, { method: 'PATCH', body: { foodId: food.id } }),
    onSuccess: (item) =>
      client.setQueryData<Scan>(queryKeys.scan(scanId), (scan) =>
        scan ? { ...scan, items: scan.items.map((i) => (i.id === item.id ? item : i)) } : scan,
      ),
  });
}

export function useRemoveScanItem(scanId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api<void>(`/api/scans/${scanId}/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: (_, itemId) =>
      client.setQueryData<Scan>(queryKeys.scan(scanId), (scan) =>
        scan ? { ...scan, items: scan.items.filter((i) => i.id !== itemId) } : scan,
      ),
  });
}

export type LogScanRequest = {
  scan: Scan;
  grams: Record<number, number>;
  date: string;
  mealType: MealType;
};

/**
 * Saves the reviewed scan: grams the user changed are sent back as
 * corrections, then every item is added to the diary.
 */
export function useLogScan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ scan, grams, date, mealType }: LogScanRequest) => {
      for (const item of scan.items) {
        const newGrams = grams[item.id] ?? item.grams;
        if (newGrams !== item.grams) {
          await api(`/api/scans/${scan.id}/items/${item.id}`, { method: 'PATCH', body: { grams: newGrams } });
        }
      }
      for (const item of scan.items) {
        await api('/api/diary/entries', {
          method: 'POST',
          body: { date, mealType, foodId: item.food.id, grams: grams[item.id] ?? item.grams, scanItemId: item.id },
        });
      }
    },
    onSuccess: (_, { date }) => invalidateDiary(client, date),
  });
}
