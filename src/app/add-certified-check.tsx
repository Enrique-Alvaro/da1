import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const currencies = ['USD', 'EUR', 'MXN'];

export default function AddCertifiedCheckScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [issuerBank, setIssuerBank] = useState('Banco Nacional');
  const [checkNumber, setCheckNumber] = useState('987654321');
  const [amount, setAmount] = useState('100,000');
  const [currency, setCurrency] = useState('USD');
  const [issueDate, setIssueDate] = useState('');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Cheque Certificado</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Registra tu cheque certificado.
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={styles.label}>Banco Emisor</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={issuerBank}
              onChangeText={setIssuerBank}
              placeholder="Banco Nacional"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>Número de Cheque</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={checkNumber}
              onChangeText={setCheckNumber}
              placeholder="987654321"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>Monto Certificado</ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="100,000"
                  placeholderTextColor="#9AA0A6"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>Moneda</ThemedText>
                <Pressable
                  style={[styles.selectBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
                  onPress={() => {
                    const next = currencies[(currencies.indexOf(currency) + 1) % currencies.length] || currencies[0];
                    setCurrency(next);
                  }}
                >
                  <ThemedText>{currency}</ThemedText>
                </Pressable>
              </View>
            </View>

            <ThemedText style={styles.label}>Fecha de Emisión</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.surface }]}
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="mm/dd/yyyy"
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
