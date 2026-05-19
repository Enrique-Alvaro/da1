import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const paymentMethods = [
  {
    id: 'card-5678',
    title: 'Visa',
    subtitle: '.... 5678',
    status: 'Verificado',
    reserved: 'USD 25,000',
    icon: '💳',
  },
  {
    id: 'bank-1234',
    title: 'Banco Nacional',
    subtitle: '.... 1234',
    status: 'Verificado',
    reserved: 'USD 50,000',
    icon: '🏦',
  },
  {
    id: 'check-987654',
    title: 'Cheque Certificado',
    subtitle: '987654',
    status: 'Pendiente',
    reserved: 'USD 100,000',
    icon: '✅',
  },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Métodos de Pago</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Administra tus garantías de pago.
          </ThemedText>

          {paymentMethods.map((method) => {
            const statusColor = method.status === 'Verificado' ? theme.success : theme.primaryDark;

            return (
              <View key={method.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.backgroundSelected }]}> 
                <View style={styles.methodHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}> 
                    <ThemedText>{method.icon}</ThemedText>
                  </View>
                  <View style={styles.methodText}>
                    <ThemedText type="subtitle">{method.title}</ThemedText>
                    <ThemedText themeColor="textSecondary">{method.subtitle}</ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: statusColor }]}> 
                    <ThemedText style={[styles.statusText, { color: statusColor }]}>{method.status}</ThemedText>
                  </View>
                </View>
                <View style={styles.methodBody}>
                  <ThemedText type="small" themeColor="textSecondary">Monto Reservado</ThemedText>
                  <ThemedText>{method.reserved}</ThemedText>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => router.push('/payment-method-verify')}>
                    <ThemedText style={[styles.linkText, { color: theme.text }]}>Ver Detalles</ThemedText>
                  </Pressable>
                  <Pressable>
                    <ThemedText style={[styles.deleteText, { color: theme.error }]}>Eliminar</ThemedText>
                  </Pressable>
                </View>
              </View>
            );
          })}

          <Pressable style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/select-payment-method')}>
            <ThemedText type="default" style={styles.primaryButtonText}>Agregar método</ThemedText>
          </Pressable>

          <Pressable style={[styles.secondaryButton, { borderColor: theme.backgroundSelected }]} onPress={() => router.push('/reserve-funds')}>
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
