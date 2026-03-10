import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { T } from '../theme/colors';
import { AuroraBackground } from '../components/AuroraBackground';

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

function toErrorString(e: unknown): string {
  if (typeof e === 'string' && e.trim()) return e.trim();
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim() && msg !== '{}') return msg.trim();
  }
  if (e instanceof Error && e.message) return e.message;
  return 'Something went wrong. Please try again.';
}

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(toErrorString(err));
    } catch (err) {
      setError(toErrorString(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Sign in to access your items.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <AnimatedPressable
            style={({ pressed }) => [styles.button, loading && styles.buttonDisabled, pressed && !loading && { opacity: 0.8 }]}
            onPress={handleSubmit}
            disabled={loading}
            hitSlop={hitSlop}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
          </AnimatedPressable>
        </View>
        <AnimatedPressable onPress={() => navigation.navigate('Signup')} hitSlop={hitSlop}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  inner: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 20,
    marginBottom: 24,
  },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: T.inputBg,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  errorBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.errorBorder,
    backgroundColor: T.errorBg,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: T.error, fontSize: 14 },
  button: {
    backgroundColor: T.ctaBg,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
  link: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' },
});
