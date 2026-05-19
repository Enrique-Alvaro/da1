import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const options = [
  {
    id: 'bank',
    title: 'Cuenta Bancaria',
    description: 'Reserva fondos desde tu cuenta',
    icon: '🏦',
    route: '/add-bank-account',
  },
  {
    id: 'card',
    title: 'Tarjeta de Crédito',
    description: 'Nacional o internacional',
    icon: '💳',
    route: '/add-payment-card',
  },
  {
    id: 'check',
    title: 'Cheque Certificado',
    description: 'Entregado antes de la subasta',
    icon: '🧾',
    route: '/add-certified-check',
  },
];

export default function SelectPaymentMethodScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Selecciona Método de Pago</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Elige cómo deseas garantizar tu participación.
          </ThemedText>

          {options.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.optionCard, { backgroundColor: theme.surface, borderColor: theme.backgroundSelected }]}
              onPress={() => router.push(option.route)}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText>{option.icon}</ThemedText>
                </View>
                <View style={styles.optionText}>
                  <ThemedText type="subtitle">{option.title}</ThemedText>
                  <ThemedText themeColor="textSecondary">{option.description}</ThemedText>
                </View>
              </View>
              <ThemedText themeColor="textSecondary">›</ThemedText>
            </Pressable>
          ))}

          <View style={[styles.infoBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}> 
            <ThemedText type="small" themeColor="textSecondary">
              Importante: Todos los métodos de pago deben ser verificados antes de participar en subastas.
            </ThemedText>
          </View>
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
  optionCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionHeader: {
    flexDirection: 'row',
    gap: Spacing.four,
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  infoBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
  },
});
