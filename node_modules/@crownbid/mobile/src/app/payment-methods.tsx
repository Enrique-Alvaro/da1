import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { disablePaymentMethod, fetchPaymentMethods } from '@/services/api';
import type { PaymentMethod } from '@/services/types';

const TYPE_LABELS: Record<string, string> = {
  tarjeta_credito: 'Tarjeta de Crédito',
  tarjeta_credito_extranjera: 'Tarjeta Extranjera',
  cuenta_bancaria: 'Cuenta Bancaria',
  cuenta_bancaria_extranjera: 'Cuenta Bancaria Extranjera',
  cheque_certificado: 'Cheque Certificado',
};

const TYPE_ICONS: Record<string, string> = {
  tarjeta_credito: '💳',
  tarjeta_credito_extranjera: '💳',
  cuenta_bancaria: '🏦',
  cuenta_bancaria_extranjera: '🏦',
  cheque_certificado: '✅',
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  verificado: 'Verificado',
  rechazado: 'Rechazado',
  deshabilitado: 'Deshabilitado',
};

function getSubtitle(method: PaymentMethod): string {
  if (method.lastDigits) return `.... ${method.lastDigits}`;
  if (method.aliasOrCbu) return method.aliasOrCbu;
  if (method.entity) return method.entity;
  return method.holder;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null || amount === undefined) return '—';
  return `${currency} ${amount.toLocaleString('es-AR')}`;
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [disabling, setDisabling] = useState<number | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPaymentMethods()
      .then((res) => setMethods(res.items))
      .catch(() => setError('No se pudieron cargar los métodos de pago.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmDisable(id: number) {
    setDisableError(null);
    setDisabling(id);
    try {
      await disablePaymentMethod(id);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      setDisableError((err as { message?: string })?.message ?? 'No se pudo eliminar el método de pago.');
    } finally {
      setDisabling(null);
      setConfirmingId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Métodos de Pago</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Administra tus garantías de pago.
          </ThemedText>

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}

          {!loading && error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {!loading && disableError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{disableError}</Text>
            </View>
          )}

          {!loading && !error && methods.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No tenés métodos de pago registrados.
            </ThemedText>
          )}

          {!loading && !error && methods.map((method) => {
            const statusLabel = STATUS_LABELS[method.status] ?? method.status;
            const isVerified = method.status === 'verificado';
            const statusColor = isVerified ? theme.success : theme.primaryDark;
            const reservedAmount = method.availableAmount ?? method.guaranteeAmount;
            const isConfirming = confirmingId === method.id;

            return (
              <View
                key={method.id}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.backgroundSelected }]}
              >
                <View style={styles.methodHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText>{TYPE_ICONS[method.type] ?? '💳'}</ThemedText>
                  </View>
                  <View style={styles.methodText}>
                    <ThemedText type="subtitle">{TYPE_LABELS[method.type] ?? method.type}</ThemedText>
                    <ThemedText themeColor="textSecondary">{getSubtitle(method)}</ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                    <ThemedText style={[styles.statusText, { color: statusColor }]}>{statusLabel}</ThemedText>
                  </View>
                </View>

                <View style={styles.methodBody}>
                  <ThemedText type="small" themeColor="textSecondary">Monto Reservado</ThemedText>
                  <ThemedText>{formatAmount(reservedAmount, method.currency)}</ThemedText>
                </View>

                {method.rejectionReason && (
                  <View style={styles.methodBody}>
                    <ThemedText type="small" themeColor="textSecondary">Motivo de rechazo</ThemedText>
                    <ThemedText>{method.rejectionReason}</ThemedText>
                  </View>
                )}

                {isConfirming ? (
                  <View style={styles.confirmRow}>
                    <ThemedText type="small">¿Eliminar este método?</ThemedText>
                    <View style={styles.confirmButtons}>
                      <Pressable
                        style={[styles.confirmBtn, { borderColor: theme.error }]}
                        onPress={() => confirmDisable(method.id)}
                        disabled={disabling === method.id}
                      >
                        <Text style={[styles.confirmBtnText, { color: theme.error }]}>
                          {disabling === method.id ? 'Eliminando...' : 'Sí, eliminar'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.confirmBtn, { borderColor: theme.backgroundSelected }]}
                        onPress={() => setConfirmingId(null)}
                        disabled={disabling === method.id}
                      >
                        <ThemedText style={styles.confirmBtnText}>Cancelar</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => router.push('/payment-method-verify')}>
                      <ThemedText style={[styles.linkText, { color: theme.text }]}>Ver Detalles</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => { setDisableError(null); setConfirmingId(method.id); }}>
                      <ThemedText style={[styles.deleteText, { color: theme.error }]}>Eliminar</ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/select-payment-method')}
          >
            <ThemedText type="default" style={styles.primaryButtonText}>Agregar método</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { borderColor: theme.backgroundSelected }]}
            onPress={() => router.push('/reserve-funds')}
          >
            <ThemedText>Reservar Fondos</ThemedText>
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
  centered: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
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
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodText: {
    flex: 1,
    gap: 4,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  methodBody: {
    gap: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkText: {
    fontWeight: '600',
  },
  deleteText: {
    fontWeight: '600',
  },
  confirmRow: {
    gap: Spacing.two,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  confirmBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
});
