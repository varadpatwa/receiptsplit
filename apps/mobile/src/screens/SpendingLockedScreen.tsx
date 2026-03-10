import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { T } from '../theme/colors';
import { AuroraBackground } from '../components/AuroraBackground';

export default function SpendingLockedScreen() {
  const navigation = useNavigation<any>();

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.2)" />
        <Text style={styles.title}>Spending Analytics</Text>
        <Text style={styles.muted}>Log in to track your spending across splits, categories, and time periods.</Text>
        <AnimatedPressable
          onPress={() => navigation.navigate('Login')}
          style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.loginBtnText}>Log in</Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
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
    backgroundColor: T.ctaBg,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  loginBtnText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
});
