import React from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <Text style={styles.title}>Search</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Search..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            editable={false}
          />
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { flex: 1, padding: 20, paddingTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerSpacer: { width: 24 },
  title: { flex: 1, fontSize: 28, fontWeight: '600', color: '#fff', textAlign: 'center' },
  inputWrap: { marginBottom: 16 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
});
