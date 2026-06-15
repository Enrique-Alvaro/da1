import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { fetchPaymentMethods } from '@/services/api';
import type { PaymentMethod } from '@/services/types';

const STATUS_COPY: Record<string, { title: string; message: string; icon: string }> = {
  pendiente: {
    icon: '🔍',
    title: 'Verificación en proceso',
    message:
      'Tu medio de pago fue registrado correctamente. El equipo de CrownBid lo verificará antes de que puedas participar en subastas.',
  },
  verificado: {
    icon: '✓',
    title: 'Medio verificado',
    message: 'Tu medio de pago está verificado. Ya podés usarlo para participar en subastas.',
  },
  rechazado: {
    icon: '✕',
    title: 'Medio rechazado',
    message: 'Tu medio de pago fue rechazado. Revisá los datos o registrá otro método.',
  },
  deshabilitado: {
    icon: '—',
    title: 'Medio deshabilitado',
    message: 'Este medio de pago ya no está activo.',
  },
};

function formatAmount(amount: number | null, currency: string): string {
  if (amount == null) return 'Sin monto reservado';
  return `${currency} $${amount.toLocaleString('es-AR')}`;
}

export default function PaymentMethodVerifyScreen() {
  const router = useRouter();
  const { methodId } = useLocalSearchParams<{ methodId?: string }>();
  const parsedId = methodId ? Number.parseInt(methodId, 10) : NaN;

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchPaymentMethods();
        const found = Number.isFinite(parsedId)
          ? res.items.find((m) => m.id === parsedId) ?? null
          : res.items[0] ?? null;
        if (!cancelled) {
          if (!found) {
            setError('No se encontró el método de pago.');
          } else {
            setMethod(found);
          }
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el estado del método de pago.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [parsedId]);

  const copy = method ? STATUS_COPY[method.status] ?? STATUS_COPY.pendiente : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Estado del método" fallbackRoute="/payment-methods" />
      <View style={styles.content}>
        {loading && <ActivityIndicator size="large" color="#E67E22" />}

        {!loading && error && (
          <>
            <Text style={styles.title}>Sin información</Text>
            <Text style={styles.message}>{error}</Text>
          </>
        )}

        {!loading && method && copy && (
          <>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{copy.icon}</Text>
            </View>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.message}>{copy.message}</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Detalle</Text>
              <Text style={styles.infoText}>Estado: {method.status}</Text>
              <Text style={styles.infoText}>
                Garantía: {formatAmount(method.guaranteeAmount ?? method.availableAmount, method.currency)}
              </Text>
              {method.rejectionReason ? (
                <Text style={[styles.infoText, { color: '#991B1B' }]}>
                  Motivo: {method.rejectionReason}
                </Text>
              ) : null}
            </View>

            {method.status === 'pendiente' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>¿Cuánto demora?</Text>
                <Text style={styles.infoText}>
                  La verificación suele completarse dentro de las 24-48 horas hábiles.
                  Recibirás una notificación cuando esté aprobado.
                </Text>
              </View>
            )}
          </>
        )}

        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/payment-methods')}>
          <Text style={styles.primaryBtnText}>Ver mis métodos de pago</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.secondaryBtnText}>Volver al inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '700', color: '#002855', textAlign: 'center' },
  message: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  infoBox: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    width: '100%',
    gap: 6,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A' },
  infoText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: '#D35400',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  secondaryBtnText: { color: '#64748B', fontSize: 14 },
});
