import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AuthHeader } from '@/components/AuthHeader';
import { Button, ErrorText, TextField } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthHeader title="Create account" subtitle="Track meals with a photo and hit your goals." />
          <TextField label="Name (optional)" value={name} onChangeText={setName} autoComplete="name" />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <TextField
            label="Password (at least 8 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {tooShort ? <Text style={styles.hint}>Password must be at least 8 characters.</Text> : null}
          <ErrorText error={error} />
          <Button
            title="Create account"
            onPress={submit}
            loading={loading}
            disabled={!email || password.length < 8}
          />
          <Link href="/login" style={styles.link}>
            Already have an account? Sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  hint: { color: colors.textMuted, fontSize: 13 },
  link: { textAlign: 'center', color: colors.primary, fontSize: 15, fontWeight: '600', padding: spacing.sm },
});
