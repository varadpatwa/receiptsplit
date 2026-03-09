import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import GuestHomeStack from './GuestHomeStack';
import SpendingLockedScreen from '../screens/SpendingLockedScreen';
import GuestAccountScreen from '../screens/GuestAccountScreen';

const Tab = createBottomTabNavigator();

const tabIcons: Record<string, { focused: string; unfocused: string }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Spending: { focused: 'wallet', unfocused: 'wallet-outline' },
  Account: { focused: 'person', unfocused: 'person-outline' },
};

export default function GuestMainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0B0B0C', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcons[route.name];
          const name = icons ? (focused ? icons.focused : icons.unfocused) : 'ellipse';
          return <Ionicons name={name as any} size={size ?? 24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={GuestHomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Spending" component={SpendingLockedScreen} options={{ tabBarLabel: 'Spending' }} />
      <Tab.Screen name="Account" component={GuestAccountScreen} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}
