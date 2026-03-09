import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function SpendingLockedScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.2)" />
        <Text style={styles.title}>Spending Analytics</Text>
        <Text style={styles.muted}>Log in to track your spending across splits, categories, and time periods.</Text>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.loginBtnText}>Log in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#fff' },
  muted: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
  loginBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  loginBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },
});
