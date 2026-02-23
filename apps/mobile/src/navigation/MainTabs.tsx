import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SpendingScreen from '../screens/SpendingScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0B0B0C' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: { backgroundColor: '#0B0B0C', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'ReceiptSplit', tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Spending"
        component={SpendingScreen}
        options={{ tabBarLabel: 'Spending' }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ tabBarLabel: 'Friends' }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarLabel: 'Account' }}
      />
    </Tab.Navigator>
  );
}
