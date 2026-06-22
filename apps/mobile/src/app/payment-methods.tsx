import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { disablePaymentMethod, fetchPaymentMethods, getCurrentUser } from '@/services/api';
import type { PaymentMethod, UserProfile } from '@/services/types';
import { isUserAdmitted } from '@/utils/clientPermissions';

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
  if (method.lastDigits) return `•••• ${method.lastDigits}`;
  if (method.aliasOrCbu) return method.aliasOrCbu;
  if (method.entity) return method.entity;
  return method.holder;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null || amount === undefined) return '—';
  return `${currency} $${amount.toLocaleString('es-AR')}`;
}

export default function PaymentMethodsScreen() {
  const router = useRouter();

  // La lista arranca vacía, como pediste, esperando los datos de la API
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [disabling, setDisabling] = useState<number | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [admissionBlocked, setAdmissionBlocked] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setAdmissionBlocked(false);
    getCurrentUser()
      .then((user: UserProfile) => {
        if (!isUserAdmitted(user)) {
          setAdmissionBlocked(true);
          setMethods([]);
          setLoading(false);
          return null;
        }
        return fetchPaymentMethods();
      })
      .then((res) => {
        if (res) setMethods(res.items);
      })
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
      <ScreenHeader title="Métodos de Pago" fallbackRoute="/home" />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView 
          style={{ width: '100%' }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          
          <View style={styles.headerContainer}>
            <Text style={styles.subtitle}>
              Administra tus garantías de pago
            </Text>
          </View>
          <View style={styles.backActionRow}>
            <Pressable
              style={styles.backActionButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            >
              <Text style={styles.backActionText}>Volver</Text>
            </Pressable>
          </View>

          {admissionBlocked ? (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>Cuenta pendiente de validación</Text>
              <Text style={styles.emptyText}>
                Los medios de pago estarán disponibles cuando la empresa apruebe tu registro.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#E67E22" />
            </View>
          ) : null}

          {!admissionBlocked && !loading && error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {!admissionBlocked && !loading && disableError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{disableError}</Text>
            </View>
          )}

          {!admissionBlocked && !loading && !error && methods.length === 0 && (
            <Text style={styles.emptyText}>
              Aún no tienes métodos de pago registrados.
            </Text>
          )}

          {/* Si se agregan métodos desde la API, se renderizarán con el nuevo diseño */}
          {!loading && !error && methods.map((method) => {
            const statusLabel = STATUS_LABELS[method.status] ?? method.status;
            const isVerified = method.status === 'verificado';
            
            // Colores dinámicos para los estados (Verde para verificado, Naranja para pendiente)
            const statusColor = isVerified ? '#10B981' : '#E67E22';
            const statusBgColor = isVerified ? '#D1FAE5' : '#FEF3C7';
            
            // Color de la caja del ícono (Azul para tarjeta, Verde para cheque, etc.)
            const iconBgColor = method.type.includes('tarjeta') ? '#2563EB' : '#059669';
            
            const reservedAmount = method.availableAmount ?? method.guaranteeAmount;
            const isConfirming = confirmingId === method.id;

            return (
              <View key={method.id} style={styles.card}>
                <View style={styles.methodHeader}>
                  <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
                    <Text style={styles.iconText}>{TYPE_ICONS[method.type] ?? '💳'}</Text>
                  </View>
                  <View style={styles.methodTextContainer}>
                    <Text style={styles.methodTitle}>{TYPE_LABELS[method.type] ?? method.type}</Text>
                    <Text style={styles.methodSubtitle}>{getSubtitle(method)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
                    {/* Un pequeño ícono dinámico junto al texto del estado */}
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {isVerified ? '⊙ ' : '◷ '}{statusLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.reservedBox}>
                  <Text style={styles.reservedLabel}>Monto Reservado</Text>
                  <Text style={styles.reservedAmount}>{formatAmount(reservedAmount, method.currency)}</Text>
                </View>

                {method.rejectionReason && (
                  <View style={[styles.reservedBox, { backgroundColor: '#FEE2E2', marginTop: 8 }]}>
                    <Text style={[styles.reservedLabel, { color: '#991B1B' }]}>Motivo de rechazo</Text>
                    <Text style={{ color: '#991B1B', fontWeight: '500' }}>{method.rejectionReason}</Text>
                  </View>
                )}

                {isConfirming ? (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmTitle}>¿Eliminar este método?</Text>
                    <View style={styles.confirmButtons}>
                      <Pressable
                        style={[styles.confirmBtn, { borderColor: '#E74C3C' }]}
                        onPress={() => confirmDisable(method.id)}
                        disabled={disabling === method.id}
                      >
                        <Text style={[styles.confirmBtnText, { color: '#E74C3C' }]}>
                          {disabling === method.id ? 'Eliminando...' : 'Sí, eliminar'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.confirmBtn, { borderColor: '#D1D5DB' }]}
                        onPress={() => setConfirmingId(null)}
                        disabled={disabling === method.id}
                      >
                        <Text style={[styles.confirmBtnText, { color: '#4B5563' }]}>Cancelar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => router.push(`/payment-method-verify?methodId=${method.id}`)}>
                      <Text style={styles.linkText}>Ver Detalles</Text>
                    </Pressable>
                    {method.type !== 'cheque_certificado' && (
                      <Pressable onPress={() => router.push(`/reserve-funds?methodId=${method.id}`)}>
                        <Text style={styles.linkText}>
                          {method.guaranteeAmount ? 'Modificar reserva' : 'Reservar fondos'}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => { setDisableError(null); setConfirmingId(method.id); }}>
                      <Text style={styles.deleteText}>Eliminar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* Botón de Agregar (Borde Punteado) */}
          <Pressable
            style={styles.dashedButton}
            onPress={() => router.push('/select-payment-method')}
          >
            <Text style={styles.dashedButtonText}>+  Agregar Método de Pago</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 24,
  },
  content: {
    width: '100%',
    paddingBottom: Spacing.six,
  },
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A1E3F', // Azul marino oscuro
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280', // Gris
  },
  centered: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  backActionRow: {
    marginTop: 18,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  backActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  backActionText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FFECEC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#7B241C',
    fontSize: 14,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#002855',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    color: '#6B7280',
    fontSize: 15,
  },
  card: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  methodTextContainer: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A1E3F',
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
  },
  reservedBox: {
    backgroundColor: '#F9FAFB', // Gris muy claro
    borderRadius: 8,
    padding: 12,
  },
  reservedLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  reservedAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  linkText: {
    fontWeight: '600',
    color: '#2563EB', // Azul para el enlace
    fontSize: 15,
  },
  deleteText: {
    fontWeight: '600',
    color: '#DC2626', // Rojo para eliminar
    fontSize: 15,
  },
  confirmRow: {
    marginTop: 16,
  },
  confirmTitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    fontWeight: '600',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dashedButton: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB', // Gris claro
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  dashedButtonText: {
    color: '#4B5563', // Gris oscuro
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#E67E22', // Naranja
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});