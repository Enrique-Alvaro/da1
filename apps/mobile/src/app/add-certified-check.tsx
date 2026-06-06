import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPaymentMethod } from '@/services/api';

export default function AddCertifiedCheckScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [issuerBank, setIssuerBank] = useState('');
  const [holder, setHolder] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('USD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const parsedAmount = parseFloat(amount.replace(/,/g, '.'));

    if (!issuerBank.trim() || !holder.trim()) {
      setError('Completá banco emisor y titular.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un monto mayor a 0.');
      return;
    }

    setSubmitting(true);
    try {
      await createPaymentMethod({
        tipo: 'cheque_certificado',
        moneda: currency,
        titular: holder.trim(),
        entidad: issuerBank.trim(),
        aliasOCbu: checkNumber.trim() || null,
        montoGarantia: parsedAmount,
      });
      router.replace('/payment-methods');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Ocurrió un error al registrar el cheque.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Cheque Certificado</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Registra tu cheque certificado.
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={styles.label}>Banco Emisor</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={issuerBank}
              onChangeText={setIssuerBank}
              placeholder="Nombre del banco"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>Titular</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={holder}
              onChangeText={setHolder}
              placeholder="Nombre completo del titular"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>Número de Cheque</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={checkNumber}
              onChangeText={setCheckNumber}
              placeholder="Opcional"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>Monto Certificado</ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="100000"
                  placeholderTextColor="#9AA0A6"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>Moneda</ThemedText>
                <View style={[styles.toggle, { borderColor: theme.backgroundSelected }]}>
                  <Pressable
                    style={[styles.toggleOption, currency === 'ARS' && { backgroundColor: theme.primary }]}
                    onPress={() => setCurrency('ARS')}
                  >
                    <ThemedText style={currency === 'ARS' ? styles.toggleTextActive : undefined}>ARS</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.toggleOption, currency === 'USD' && { backgroundColor: theme.primary }]}
                    onPress={() => setCurrency('USD')}
                  >
                    <ThemedText style={currency === 'USD' ? styles.toggleTextActive : undefined}>USD</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
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
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowItem: {
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    height: 50,
  },
  toggleOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
});
