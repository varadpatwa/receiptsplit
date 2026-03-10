import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const AVATAR_COLORS = [
  '#7B5EA7', // purple
  '#5B6ABF', // indigo
  '#4A7FD4', // blue
  '#3ECF8E', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#F97316', // orange
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

export function Avatar({ name, avatarUrl, size = 36 }: AvatarProps) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const color = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '700',
  },
});
