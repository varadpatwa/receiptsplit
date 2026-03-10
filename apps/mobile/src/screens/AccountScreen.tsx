import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../theme/colors';
import { AuroraBackground } from '../components/AuroraBackground';

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
import { useAuth } from '../contexts/AuthContext';
import { getProfile, upsertProfile, isHandleAvailable } from '../lib/supabase';
import { validateHandle } from '@receiptsplit/shared';
import { supabase } from '../lib/supabase';

type Profile = { id: string; handle: string; display_name: string | null };

export default function AccountScreen() {
  const { userId, email, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingHandle, setEditingHandle] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    getProfile()
      .then((p) => {
        setProfile(p);
        if (p) {
          setNewHandle(p.handle);
          setNewDisplayName(p.display_name || '');
        }
      })
      .catch(() => setProfile(null));
  }, [userId]);

  const handleSaveHandle = async () => {
    if (!profile) return;
    const v = validateHandle(newHandle);
    if (!v.valid) {
      setError(v.error || 'Invalid handle');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const available = await isHandleAvailable(newHandle);
      if (!available) {
        setError('This handle is already taken');
        setSaving(false);
        return;
      }
      const updated = await upsertProfile(newHandle, profile.display_name || undefined);
      setProfile(updated);
      setEditingHandle(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update handle');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await upsertProfile(profile.handle, newDisplayName || undefined);
      setProfile(updated);
      setEditingDisplayName(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update display name');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLogoutLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign out');
    } finally {
      setLogoutLoading(false);
    }
  };

  if (!session || !userId) {
    return (
      <AuroraBackground><SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.muted}>Sign in to manage your account.</Text>
        </View>
      </SafeAreaView></AuroraBackground>
    );
  }

  return (
    <AuroraBackground><SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Manage your profile.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.label}>Handle</Text>
        {editingHandle ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={newHandle}
              onChangeText={(v) => {
                setNewHandle(v.toLowerCase());
                setError(null);
              }}
              editable={!saving}
              autoCapitalize="none"
            />
            <View style={styles.editActions}>
              <AnimatedPressable
                style={({ pressed }) => [styles.smallButton, (saving || !validateHandle(newHandle).valid || newHandle === profile?.handle) && styles.buttonDisabled, pressed && !saving && { opacity: 0.8 }]}
                onPress={handleSaveHandle}
                disabled={saving || !validateHandle(newHandle).valid || newHandle === profile?.handle}
                hitSlop={hitSlop}
              >
                <Text style={styles.smallButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </AnimatedPressable>
              <AnimatedPressable style={({ pressed }) => [styles.outlineButton, pressed && !saving && { opacity: 0.8 }]} onPress={() => setEditingHandle(false)} disabled={saving} hitSlop={hitSlop}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.value}>@{profile?.handle ?? '—'}</Text>
            <AnimatedPressable style={({ pressed }) => [styles.outlineButton, pressed && { opacity: 0.8 }]} onPress={() => setEditingHandle(true)} hitSlop={hitSlop}>
              <Text style={styles.outlineButtonText}>Edit</Text>
            </AnimatedPressable>
          </View>
        )}
        <Text style={styles.label}>Display Name</Text>
        {editingDisplayName ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              editable={!saving}
            />
            <View style={styles.editActions}>
              <AnimatedPressable style={({ pressed }) => [styles.smallButton, saving && styles.buttonDisabled, pressed && !saving && { opacity: 0.8 }]} onPress={handleSaveDisplayName} disabled={saving} hitSlop={hitSlop}>
                <Text style={styles.smallButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </AnimatedPressable>
              <AnimatedPressable style={({ pressed }) => [styles.outlineButton, pressed && !saving && { opacity: 0.8 }]} onPress={() => setEditingDisplayName(false)} disabled={saving} hitSlop={hitSlop}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.value}>{profile?.display_name || '—'}</Text>
            <AnimatedPressable style={({ pressed }) => [styles.outlineButton, pressed && { opacity: 0.8 }]} onPress={() => setEditingDisplayName(true)} hitSlop={hitSlop}>
              <Text style={styles.outlineButtonText}>Edit</Text>
            </AnimatedPressable>
          </View>
        )}
        <Text style={styles.label}>Email</Text>
        <Text style={styles.valueMuted}>{email ?? '—'}</Text>
      </View>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <AnimatedPressable
        style={({ pressed }) => [styles.logoutButton, logoutLoading && styles.buttonDisabled, pressed && !logoutLoading && { opacity: 0.8 }]}
        onPress={handleSignOut}
        disabled={logoutLoading}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={styles.logoutButtonText}>{logoutLoading ? 'Signing out...' : 'Sign out'}</Text>
      </AnimatedPressable>
      </View>
    </SafeAreaView></AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 20, paddingTop: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  muted: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  value: { color: '#fff', fontSize: 16 },
  valueMuted: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  editRow: { marginBottom: 16 },
  input: {
    backgroundColor: T.inputBg,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  smallButton: {
    backgroundColor: T.ctaBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  smallButtonText: { color: T.ctaText, fontSize: 14, fontWeight: '600' },
  outlineButton: {
    borderWidth: 1,
    borderColor: T.chipActiveBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  outlineButtonText: { color: '#fff', fontSize: 14 },
  errorBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.errorBorder,
    backgroundColor: T.errorBg,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: T.error, fontSize: 14 },
  logoutButton: {
    backgroundColor: T.cardBg,
    borderWidth: 1,
    borderColor: T.cardBorder,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
