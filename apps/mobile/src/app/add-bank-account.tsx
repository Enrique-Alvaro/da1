import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const countries = ['México', 'Estados Unidos', 'España', 'Colombia', 'Argentina'];

export default function AddBankAccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [bankName, setBankName] = useState('Banco Nacional');
  const [country, setCountry] = useState('');
  const [accountHolder, setAccountHolder] = useState('Juan Pérez');
  const [accountNumber, setAccountNumber] = useState('');
  const [swift, setSwift] = useState('');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Agregar Cuenta Bancaria</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Nacional o internacional.
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={styles.label}>Nombre del Banco</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Banco Nacional"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>País</ThemedText>
            <Pressable
              style={[styles.selectBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              onPress={() => {
                const next = countries[(countries.indexOf(country) + 1) % countries.length] || countries[0];
                setCountry(next);
              }}
            >
              <ThemedText>{country || 'Seleccionar país'}</ThemedText>
            </Pressable>

            <ThemedText style={styles.label}>Titular de la Cuenta</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="Juan Pérez"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>Número de Cuenta / IBAN</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="ES91 2100 0418 4502 0005 1332"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>Código SWIFT / BIC</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={swift}
              onChangeText={setSwift}
              placeholder=""
              placeholderTextColor="#9AA0A6"
            />
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
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
});
