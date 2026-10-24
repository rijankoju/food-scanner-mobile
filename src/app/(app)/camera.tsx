import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { startScan } from '@/lib/scanUpload';
import { colors, spacing } from '@/theme';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async (photo: { uri: string; width: number; height: number }) => {
    setBusy(true);
    setError(null);
    try {
      const scanId = await startScan(photo);
      router.replace(`/scan/${scanId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const photo = await camera.current?.takePictureAsync({ quality: 0.8 });
    if (photo) await scan(photo);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await scan({ uri: asset.uri, width: asset.width, height: asset.height });
    }
  };

  if (!permission) {
    return <View style={styles.dark} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.dark, styles.centered]}>
        <Text style={styles.message}>FoodScan needs the camera to photograph your meal.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
        <Button title="Choose from library instead" variant="secondary" onPress={pickPhoto} />
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.dark}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={16} accessibilityLabel="Close camera">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.tip}>Shoot from above with the whole plate in frame</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.controls}>
          <Pressable onPress={pickPhoto} disabled={busy} style={styles.sideButton} accessibilityLabel="Pick from library">
            <Text style={styles.sideText}>Library</Text>
          </Pressable>
          <Pressable
            onPress={takePhoto}
            disabled={!ready || busy}
            style={({ pressed }) => [styles.shutter, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Take photo"
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.sideButton} />
        </View>
      </SafeAreaView>

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.busyText}>Uploading photo…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  message: { color: '#fff', fontSize: 17, textAlign: 'center', marginBottom: spacing.md },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', padding: spacing.lg },
  close: { color: '#fff', fontSize: 24 },
  tip: {
    alignSelf: 'center',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    overflow: 'hidden',
  },
  error: { color: '#fff', backgroundColor: colors.danger, padding: spacing.sm, marginHorizontal: spacing.lg },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.xl,
  },
  sideButton: { width: 72, alignItems: 'center' },
  sideText: { color: '#fff', fontSize: 15 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  busy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  busyText: { color: '#fff', fontSize: 16 },
});
