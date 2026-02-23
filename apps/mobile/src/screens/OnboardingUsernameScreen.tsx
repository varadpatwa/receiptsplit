import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { validateHandle } from '@receiptsplit/shared';
import { upsertProfile, isHandleAvailable } from '../lib/supabase';
import { useProfileRefresh } from '../contexts/ProfileRefreshContext';

export default function OnboardingUsernameScreen() {
  const refreshProfile = useProfileRefresh();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const handleValidation = validateHandle(handle);
  const isValidFormat = handleValidation.valid;

  useEffect(() => {
    if (!handle.trim() || !isValidFormat) return;
    const t = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const available = await isHandleAvailable(handle);
        if (!available) setError('This handle is already taken');
        else setError(null);
      } catch {
        // ignore
      } finally {
        setCheckingAvailability(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [handle, isValidFormat]);

  const handleSubmit = async () => {
    if (!isValidFormat) {
      setError(handleValidation.error || 'Invalid handle format');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const available = await isHandleAvailable(handle);
      if (!available) {
        setError('This handle is already taken');
        setLoading(false);
        return;
      }
      await upsertProfile(handle, displayName || undefined);
      if (refreshProfile) await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Choose your handle</Text>
        <Text style={styles.subtitle}>Your handle is how others will find and mention you.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Handle</Text>
          <TextInput
            style={styles.input}
            placeholder="username"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={handle}
            onChangeText={(v) => {
              setHandle(v.toLowerCase());
              setError(null);
            }}
            autoCapitalize="none"
            editable={!loading}
          />
          {handle && !isValidFormat && (
            <Text style={styles.hintError}>{handleValidation.error}</Text>
          )}
          {checkingAvailability && <Text style={styles.hint}>Checking availability...</Text>}
          <Text style={styles.hint}>3-20 characters, lowercase letters, numbers, and underscores only</Text>
          <Text style={styles.label}>Display Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading}
          />
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.button, (loading || !isValidFormat || checkingAvailability || !!error) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !isValidFormat || checkingAvailability || !!error}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating profile...' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C' },
  inner: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 16 },
  hintError: { color: '#f87171', fontSize: 12, marginBottom: 16 },
  errorBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#f87171', fontSize: 14 },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '600' },
});
