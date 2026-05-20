import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function PaymentVerifySuccessScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}> 
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}> 
            <ThemedText style={{ fontSize: 28 }}>✓</ThemedText>
          </View>
          <ThemedText type="title">¡Método Verificado!</ThemedText>
          <ThemedText type="small" style={styles.message}>
            Tu método de pago ha sido verificado exitosamente. Ya puedes participar en subastas.
          </ThemedText>
          <View style={[styles.statusCard, { borderColor: theme.success, backgroundColor: theme.surface }]}> 
            <ThemedText type="subtitle">Método de pago</ThemedText>
            <ThemedText>•••• 3456</ThemedText>
            <ThemedText style={{ color: theme.success, fontWeight: '700' }}>Estado: Verificado ✓</ThemedText>
          </View>
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.success }]} onPress={() => router.push('/payment-methods')}>
            <ThemedText type="default" style={styles.primaryButtonText}>Ver Métodos de Pago</ThemedText>
          </Pressable>
          <Pressable style={[styles.secondaryButton, { borderColor: theme.backgroundSelected }]} onPress={() => router.push('/explore')}>
            <ThemedText>Volver al Inicio</ThemedText>
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
  statusCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.four,
    gap: Spacing.one,
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
