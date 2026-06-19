import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchPaymentMethods, updatePaymentMethodGuarantee } from '@/services/api';
import type { PaymentMethod } from '@/services/types';

const CURRENCY_OPTIONS = [
  { code: 'ARS', label: 'ARS - Peso Argentino' },
  { code: 'USD', label: 'USD - Dólar Estadounidense' },
] as const;

export default function ReserveFundsScreen() {
  const router = useRouter();
  const { methodId } = useLocalSearchParams<{ methodId?: string }>();
  const parsedMethodId = methodId ? Number.parseInt(methodId, 10) : NaN;

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const currencyLabel = useMemo(() => {
    const code = method?.currency ?? 'ARS';
    return CURRENCY_OPTIONS.find((c) => c.code === code)?.label ?? code;
  }, [method?.currency]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPaymentMethods();
        const found = Number.isFinite(parsedMethodId)
          ? res.items.find((m) => m.id === parsedMethodId) ?? null
          : res.items.find((m) => m.type !== 'cheque_certificado' && !m.guaranteeAmount) ?? null;

        if (!found) {
          if (!cancelled) {
            setError('Seleccioná un método de pago válido desde la lista.');
          }
          return;
        }
        if (found.type === 'cheque_certificado') {
          if (!cancelled) {
            setError('El monto del cheque se define al registrarlo.');
          }
          return;
        }
        if (!cancelled) {
          setMethod(found);
          if (found.guaranteeAmount != null) {
            setAmount(String(found.guaranteeAmount));
          }
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el método de pago.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [parsedMethodId]);

  async function onContinue() {
    if (!method) return;
    const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un monto válido mayor a 0.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updatePaymentMethodGuarantee(method.id, parsedAmount);
      router.replace(`/payment-method-verify?methodId=${method.id}`);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'No se pudo reservar el monto.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Reservar Fondos" fallbackRoute="/payment-methods" />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={{ width: '100%' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.subtitle}>Define el monto de garantía para participar en subastas.</Text>
          </View>
          <View style={styles.backActionRow}>
            <Pressable
              style={styles.backActionButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/payment-methods'))}
            >
              <Text style={styles.backActionText}>Volver</Text>
            </Pressable>
          </View>

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#E67E22" />
            </View>
          )}

          {!loading && error && !method && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.linkBtn} onPress={() => router.replace('/payment-methods')}>
                <Text style={styles.linkBtnText}>Volver a métodos de pago</Text>
              </Pressable>
            </View>
          )}

          {!loading && method && (
            <>
              <View style={styles.methodBox}>
                <Text style={styles.methodLabel}>Método seleccionado</Text>
                <Text style={styles.methodValue}>#{method.id} · {method.currency}</Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Moneda</Text>
                <View style={styles.selectBox}>
                  <Text style={styles.inputText}>{currencyLabel}</Text>
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                </View>

                <Text style={styles.label}>Monto a Reservar</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Ej: 50000"
                  placeholderTextColor="#9AA0A6"
                  keyboardType="numeric"
                />
              </View>

              {error && (
                <View style={styles.inlineError}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  <Text style={styles.infoTextBold}>Nota: </Text>
                  Podés modificar el monto reservado en cualquier momento desde métodos de pago.
                </Text>
              </View>

              <Pressable
                style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
                onPress={() => void onContinue()}
                disabled={submitting}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? 'Guardando...' : 'Continuar'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingBottom: BottomTabInset + Spacing.three },
  headerContainer: { marginBottom: Spacing.three, marginTop: Spacing.two },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  backActionRow: { marginBottom: 16, alignItems: 'flex-start' },
  backActionButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  backActionText: { color: '#1D4ED8', fontWeight: '700' },
  methodBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  methodValue: { fontSize: 16, fontWeight: '700', color: '#002855' },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#002855', marginTop: 8 },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  inputText: { fontSize: 16, color: '#1F2937' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: { fontSize: 13, color: '#1E3A8A', lineHeight: 20 },
  infoTextBold: { fontWeight: '700' },
  primaryButton: {
    backgroundColor: '#E67E22',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 12,
  },
  inlineError: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorText: { color: '#991B1B', fontSize: 14 },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkBtnText: { color: '#002855', fontWeight: '600' },
});
