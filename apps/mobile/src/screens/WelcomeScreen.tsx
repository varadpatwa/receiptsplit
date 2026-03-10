import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useNavigation } from '@react-navigation/native';
import { isSupabaseConfigured } from '../lib/supabase';
import { T } from '../theme/colors';
import { AuroraBackground } from '../components/AuroraBackground';

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();

  const onSignUp = () => {
    navigation.navigate('Signup');
  };

  const onLogIn = () => {
    navigation.navigate('Login');
  };

  return (
    <AuroraBackground>
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.content}>
        <Text style={styles.title}>receiptsplit</Text>
        {!isSupabaseConfigured() && (
          <Text style={styles.hint}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env then restart the dev server.</Text>
        )}
      </View>
      <View style={styles.buttons}>
        <AnimatedPressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={onSignUp}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Sign up for free"
        >
          <Text style={styles.primaryButtonText}>SIGN UP FOR FREE</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={onLogIn}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          <Text style={styles.secondaryButtonText}>LOG IN</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={({ pressed }) => [styles.guestButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('GuestMain')}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Try without an account"
        >
          <Text style={styles.guestButtonText}>Try without an account</Text>
        </AnimatedPressable>
      </View>
    </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.5,
  },
  hint: {
    marginTop: 16,
    paddingHorizontal: 16,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    maxWidth: 420,
    paddingBottom: 48,
    gap: 16,
  },
  pressed: { opacity: 0.8 },
  primaryButton: {
    backgroundColor: T.ctaBg,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: T.ctaText,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: T.borderSubtle,
    paddingTop: 20,
    marginTop: 4,
  },
  guestButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
});
