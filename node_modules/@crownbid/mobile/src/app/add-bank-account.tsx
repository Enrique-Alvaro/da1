import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { createPaymentMethod } from '@/services/api';

type AccountScope = 'nacional' | 'extranjera';

export default function AddBankAccountScreen() {
  const router = useRouter();

  const [scope, setScope] = useState<AccountScope>('nacional');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      setError('Completá todos los campos antes de continuar.');
      return;
    }

    setSubmitting(true);
    try {
      await createPaymentMethod({
        tipo: scope === 'nacional' ? 'cuenta_bancaria' : 'cuenta_bancaria_extranjera',
        moneda: scope === 'nacional' ? 'ARS' : 'USD',
        titular: accountHolder.trim(),
        entidad: bankName.trim(),
        aliasOCbu: accountNumber.trim(),
      });
      router.replace('/payment-methods');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Ocurrió un error al agregar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={{ width: '100%' }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="business-outline" size={36} color="#9333EA" />
            </View>
            <Text style={styles.title}>Agregar Cuenta Bancaria</Text>
            <Text style={styles.subtitle}>
              Nacional o internacional
            </Text>
          </View>

          {/* Selector nacional / extranjera estilizado con el morado */}
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleOption, scope === 'nacional' && styles.toggleOptionActive]}
              onPress={() => setScope('nacional')}
            >
              <Text style={[styles.toggleText, scope === 'nacional' && styles.toggleTextActive]}>
                Nacional (ARS)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleOption, scope === 'extranjera' && styles.toggleOptionActive]}
              onPress={() => setScope('extranjera')}
            >
              <Text style={[styles.toggleText, scope === 'extranjera' && styles.toggleTextActive]}>
                Extranjera (USD)
              </Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre del Banco</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Ej: Banco Nación"
              placeholderTextColor="#9AA0A6"
            />

            <Text style={styles.label}>Titular de la Cuenta</Text>
            <TextInput
              style={styles.input}
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="Nombre completo del titular"
              placeholderTextColor="#9AA0A6"
            />

            <Text style={styles.label}>
              {scope === 'nacional' ? 'CBU / Alias' : 'Número de Cuenta / IBAN'}
            </Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder={scope === 'nacional' ? 'CBU o alias' : 'ES91 2100 0418 4502 0005 1332'}
              placeholderTextColor="#9AA0A6"
              autoCapitalize="none"
            />
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Guardando...' : 'Continuar'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF', // Morado muy claro
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0A1E3F', // Azul marino oscuro
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280', // Gris
    textAlign: 'center',
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#9333EA', // Morado brillante
  },
  toggleText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1E3F',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#9333EA', // Morado brillante
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6', // Gris claro
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FFECEC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#7B241C',
    fontSize: 14,
  },
});