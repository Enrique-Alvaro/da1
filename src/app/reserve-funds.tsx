import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const currencies = ['USD - Dólar Estadounidense', 'EUR - Euro', 'MXN - Peso Mexicano'];

export default function ReserveFundsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [currency, setCurrency] = useState(currencies[0]);
  const [amount, setAmount] = useState('50000');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Reservar Fondos</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Define el monto para participar en subastas.
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={styles.label}>Moneda</ThemedText>
            <Pressable
              style={[styles.selectBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              onPress={() => {
                const next = currencies[(currencies.indexOf(currency) + 1) % currencies.length];
                setCurrency(next);
              }}
            >
              <ThemedText>{currency}</ThemedText>
            </Pressable>

            <ThemedText style={styles.label}>Monto a Reservar</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="$ 50,000"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.infoBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}> 
            <ThemedText type="small" themeColor="textSecondary">
              Nota: Puedes modificar el monto reservado en cualquier momento desde tu perfil.
            </ThemedText>
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/payment-method-verify')}>
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
  infoBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
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
