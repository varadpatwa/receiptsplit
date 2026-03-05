import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useFriendRequests } from '../contexts/FriendRequestsContext';
import HomeStack from './HomeStack';
import SpendingScreen from '../screens/SpendingScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

const tabIcons: Record<string, { focused: string; unfocused: string }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Spending: { focused: 'wallet', unfocused: 'wallet-outline' },
  Friends: { focused: 'people', unfocused: 'people-outline' },
  Account: { focused: 'person', unfocused: 'person-outline' },
};

export default function MainTabs() {
  const { pendingIncomingCount, refreshPendingCount } = useFriendRequests();

  useFocusEffect(
    useCallback(() => {
      refreshPendingCount();
    }, [refreshPendingCount])
  );

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
          const icon = <Ionicons name={name as any} size={size ?? 24} color={color} />;
          if (route.name === 'Friends' && pendingIncomingCount > 0) {
            return (
              <View style={styles.iconWrap}>
                {icon}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingIncomingCount > 9 ? '9+' : pendingIncomingCount}</Text>
                </View>
              </View>
            );
          }
          return icon;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Spending" component={SpendingScreen} options={{ tabBarLabel: 'Spending' }} />
      <Tab.Screen name="Friends" component={FriendsScreen} options={{ tabBarLabel: 'Friends' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
