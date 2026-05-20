import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const countries = ['México', 'Estados Unidos', 'España', 'Colombia', 'Argentina'];

export default function AddPaymentCardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');
  const [billingCountry, setBillingCountry] = useState('');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Agregar Tarjeta de Pago</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Ingresa los detalles de tu tarjeta.
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={styles.label}>Número de Tarjeta</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>Fecha de Vencimiento</ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="MM/AA"
                  placeholderTextColor="#9AA0A6"
                />
              </View>
              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>CVV</ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="123"
                  placeholderTextColor="#9AA0A6"
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>
            </View>

            <ThemedText style={styles.label}>Nombre del Titular</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={holderName}
              onChangeText={setHolderName}
              placeholder="JUAN PEREZ"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>País de Facturación</ThemedText>
            <Pressable
              style={[styles.selectBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              onPress={() => {
                const next = countries[(countries.indexOf(billingCountry) + 1) % countries.length] || countries[0];
                setBillingCountry(next);
              }}
            >
              <ThemedText>{billingCountry || 'Seleccionar país'}</ThemedText>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/payment-method-verify')}
          >
            <ThemedText type="default" style={styles.primaryButtonText}>Continuar</ThemedText>
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
    borderColor: '#DADADA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  selectBox: {
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
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
});
