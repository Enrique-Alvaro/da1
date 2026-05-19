import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function PaymentMethodVerifyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [code, setCode] = useState('');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Verificación de Método de Pago</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Verifica tu método de pago para participar en subastas.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.backgroundSelected }]}> 
            <ThemedText type="subtitle">Método de pago</ThemedText>
            <ThemedText>Tarjeta •••• 3456</ThemedText>
            <View style={styles.statusRow}>
              <View style={[styles.statusChip, { borderColor: theme.success }]}> 
                <ThemedText style={[styles.statusChipText, { color: theme.success }]}>Datos registrados</ThemedText>
              </View>
              <View style={[styles.statusChip, { borderColor: theme.primaryDark }]}> 
                <ThemedText style={[styles.statusChipText, { color: theme.primaryDark }]}>Verificación en proceso</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Código de Verificación</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor="#9AA0A6"
              keyboardType="number-pad"
            />
            <ThemedText type="small" themeColor="textSecondary">Código enviado a +1 *** 4567</ThemedText>
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/payment-verify-success')}>
            <ThemedText type="default" style={styles.primaryButtonText}>Confirmar</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  content: {
    width: '100%',
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  card: {
    width: '100%',
    padding: Spacing.four,
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.two,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipText: {
    fontWeight: '600',
    fontSize: 12,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
});
