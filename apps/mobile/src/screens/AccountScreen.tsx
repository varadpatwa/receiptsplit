import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
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
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.muted}>Sign in to manage your account.</Text>
      </View>
    );
  }

  return (
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
              <TouchableOpacity
                style={styles.smallButton}
                onPress={handleSaveHandle}
                disabled={saving || !validateHandle(newHandle).valid || newHandle === profile?.handle}
              >
                <Text style={styles.smallButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setEditingHandle(false)} disabled={saving}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.value}>@{profile?.handle ?? '—'}</Text>
            <TouchableOpacity style={styles.outlineButton} onPress={() => setEditingHandle(true)}>
              <Text style={styles.outlineButtonText}>Edit</Text>
            </TouchableOpacity>
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
              <TouchableOpacity style={styles.smallButton} onPress={handleSaveDisplayName} disabled={saving}>
                <Text style={styles.smallButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setEditingDisplayName(false)} disabled={saving}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.value}>{profile?.display_name || '—'}</Text>
            <TouchableOpacity style={styles.outlineButton} onPress={() => setEditingDisplayName(true)}>
              <Text style={styles.outlineButtonText}>Edit</Text>
            </TouchableOpacity>
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
      <TouchableOpacity
        style={[styles.logoutButton, logoutLoading && styles.buttonDisabled]}
        onPress={handleSignOut}
        disabled={logoutLoading}
      >
        <Text style={styles.logoutButtonText}>{logoutLoading ? 'Signing out...' : 'Sign out'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C', padding: 20, paddingTop: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  muted: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  smallButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  smallButtonText: { color: '#000', fontSize: 14, fontWeight: '600' },
  outlineButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  outlineButtonText: { color: '#fff', fontSize: 14 },
  errorBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#f87171', fontSize: 14 },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
