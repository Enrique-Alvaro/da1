import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function RegisterConfirmation() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={{ width: '100%', alignItems: 'center' }}>
          <ThemedText type="title">Te hemos enviado un correo de confirmación</ThemedText>
          <ThemedText type="small" style={{ marginTop: Spacing.two, marginBottom: Spacing.four }}>Por favor revisa tu correo electrónico para continuar el proceso de registro</ThemedText>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/')}>
            <ThemedText type="default" style={styles.primaryButtonText}>Continuar</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, alignItems: 'center', gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, maxWidth: MaxContentWidth, width: '100%' },
  primaryButton: { backgroundColor: '#F47B1F', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: Spacing.two },
  primaryButtonText: { color: '#fff' },
});
