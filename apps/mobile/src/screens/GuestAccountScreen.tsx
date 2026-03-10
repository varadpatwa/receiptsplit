import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { T } from '../theme/colors';
import { AuroraBackground } from '../components/AuroraBackground';

export default function GuestAccountScreen() {
  const navigation = useNavigation<any>();

  return (
    <AuroraBackground><SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Ionicons name="person-circle-outline" size={64} color="rgba(255,255,255,0.2)" />
        <Text style={styles.title}>Guest Mode</Text>
        <Text style={styles.muted}>
          Create an account to save your splits, track spending, and add friends.
        </Text>
        <AnimatedPressable
          onPress={() => navigation.navigate('Signup')}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.primaryBtnText}>Sign up for free</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => navigation.navigate('Login')}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.secondaryBtnText}>Log in</Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView></AuroraBackground>
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
  primaryBtn: {
    backgroundColor: T.ctaBg,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
});
