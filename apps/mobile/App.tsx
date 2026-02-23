import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ProfileRefreshProvider } from './src/contexts/ProfileRefreshContext';
import { getProfile } from './src/lib/supabase';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import OnboardingUsernameScreen from './src/screens/OnboardingUsernameScreen';
import MainTabs from './src/navigation/MainTabs';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <StatusBar style="light" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

function AppNavigator() {
  const { sessionLoaded, userId, session } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const refreshProfile = useCallback(async () => {
    const p = await getProfile();
    setHasProfile(!!p?.handle);
  }, []);

  useEffect(() => {
    if (!sessionLoaded || !userId) {
      setHasProfile(null);
      return;
    }
    getProfile()
      .then((p) => setHasProfile(!!p?.handle))
      .catch(() => setHasProfile(true));
  }, [sessionLoaded, userId]);

  if (!sessionLoaded) return <LoadingScreen />;
  if (!session || !userId) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
      </Stack.Navigator>
    );
  }

  if (hasProfile === null) return <LoadingScreen />;
  if (!hasProfile) {
    return (
      <ProfileRefreshProvider refreshProfile={refreshProfile}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="OnboardingUsername" component={OnboardingUsernameScreen} />
        </Stack.Navigator>
      </ProfileRefreshProvider>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#0B0B0C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: 'rgba(255,255,255,0.6)' },
});
