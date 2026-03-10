import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import GuestHomeStack from './GuestHomeStack';
import SpendingLockedScreen from '../screens/SpendingLockedScreen';
import GuestAccountScreen from '../screens/GuestAccountScreen';
import { T } from '../theme/colors';
import { AnimatedTabButton } from '../components/AnimatedTabButton';

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
        tabBarStyle: { backgroundColor: T.bgTab, borderTopColor: T.bgTabBorder },
        tabBarActiveTintColor: T.tabActive,
        tabBarInactiveTintColor: T.tabInactive,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
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
