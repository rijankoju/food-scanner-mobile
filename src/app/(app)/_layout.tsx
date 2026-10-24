import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="scan/[id]" options={{ title: 'Review meal' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="goals" options={{ title: 'Goals' }} />
      <Stack.Screen name="add" options={{ title: 'Add food' }} />
      <Stack.Screen name="food/[id]" options={{ title: 'Add food' }} />
      <Stack.Screen name="entry/[id]" options={{ title: 'Edit entry' }} />
      <Stack.Screen name="progress" options={{ title: 'Progress' }} />
    </Stack>
  );
}
