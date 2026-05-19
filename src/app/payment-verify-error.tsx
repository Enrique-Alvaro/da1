import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function PaymentVerifyErrorScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}> 
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}> 
            <ThemedText style={{ fontSize: 28 }}>✕</ThemedText>
          </View>
          <ThemedText type="title">Verificación Fallida</ThemedText>
          <ThemedText type="small" style={styles.message}>
            No pudimos verificar tu método de pago.
          </ThemedText>
          <View style={[styles.alertBox, { borderColor: theme.error, backgroundColor: theme.backgroundElement }]}> 
            <ThemedText type="subtitle">Detalles del Error</ThemedText>
            <ThemedText>No se pudo verificar el método de pago. Por favor verifica los detalles ingresados o intenta con otro método.</ThemedText>
          </View>
          <View style={[styles.infoBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}> 
            <ThemedText type="small" themeColor="textSecondary">
              Importante: Necesitas al menos un método de pago verificado para participar en subastas.
            </ThemedText>
          </View>
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/select-payment-method')}>
            <ThemedText type="default" style={styles.primaryButtonText}>Intentar Otro Método</ThemedText>
          </Pressable>
          <Pressable style={[styles.secondaryButton, { borderColor: theme.backgroundSelected }]} onPress={() => router.push('/payment-methods')}>
            <ThemedText>Ver Métodos de Pago</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  card: {
    width: '100%',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  alertBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  infoBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
  },
  primaryButton: {
    width: '100%',
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
