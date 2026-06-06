import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPaymentMethod } from '@/services/api';

type AccountScope = 'nacional' | 'extranjera';

export default function AddBankAccountScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [scope, setScope] = useState<AccountScope>('nacional');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      setError('Completá todos los campos antes de continuar.');
      return;
    }

    setSubmitting(true);
    try {
      await createPaymentMethod({
        tipo: scope === 'nacional' ? 'cuenta_bancaria' : 'cuenta_bancaria_extranjera',
        moneda: scope === 'nacional' ? 'ARS' : 'USD',
        titular: accountHolder.trim(),
        entidad: bankName.trim(),
        aliasOCbu: accountNumber.trim(),
      });
      router.replace('/payment-methods');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Ocurrió un error al agregar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Agregar Cuenta Bancaria</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Nacional o internacional.
          </ThemedText>

          {/* Selector nacional / extranjera */}
          <View style={[styles.toggle, { borderColor: theme.backgroundSelected }]}>
            <Pressable
              style={[styles.toggleOption, scope === 'nacional' && { backgroundColor: theme.primary }]}
              onPress={() => setScope('nacional')}
            >
              <ThemedText style={scope === 'nacional' ? styles.toggleTextActive : undefined}>
                Nacional (ARS)
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.toggleOption, scope === 'extranjera' && { backgroundColor: theme.primary }]}
              onPress={() => setScope('extranjera')}
            >
              <ThemedText style={scope === 'extranjera' ? styles.toggleTextActive : undefined}>
                Extranjera (USD)
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.form}>
            <ThemedText style={styles.label}>Nombre del Banco</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Ej: Banco Nación"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>Titular de la Cuenta</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="Nombre completo del titular"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>
              {scope === 'nacional' ? 'CBU / Alias' : 'Número de Cuenta / IBAN'}
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder={scope === 'nacional' ? 'CBU o alias' : 'ES91 2100 0418 4502 0005 1332'}
              placeholderTextColor="#9AA0A6"
              autoCapitalize="none"
            />
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <ThemedText type="default" style={styles.primaryButtonText}>
              {submitting ? 'Guardando...' : 'Continuar'}
            </ThemedText>
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
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  form: {
    gap: Spacing.three,
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
  errorBanner: {
    backgroundColor: '#FFECEC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  errorBannerText: {
    color: '#7B241C',
    fontSize: 14,
  },
});
