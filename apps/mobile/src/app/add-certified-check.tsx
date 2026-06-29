import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { createPaymentMethod } from '@/services/api';

export default function AddCertifiedCheckScreen() {
  const router = useRouter();

  const [issuerBank, setIssuerBank] = useState('');
  const [holder, setHolder] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('USD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const parsedAmount = parseFloat(amount.replace(/,/g, '.'));

    if (!issuerBank.trim() || !holder.trim()) {
      setError('Completá banco emisor y titular.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un monto mayor a 0.');
      return;
    }

    setSubmitting(true);
    try {
      await createPaymentMethod({
        tipo: 'cheque_certificado',
        moneda: currency,
        titular: holder.trim(),
        entidad: issuerBank.trim(),
        aliasOCbu: checkNumber.trim() || null,
        montoGarantia: parsedAmount,
      });
      router.replace('/payment-methods');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Ocurrió un error al registrar el cheque.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        
        {/* Formulario con Scroll */}
        <ScrollView 
          style={{ width: '100%', flex: 1 }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={36} color="#059669" />
            </View>
            <Text style={styles.title}>Cheque Certificado</Text>
            <Text style={styles.subtitle}>
              Registra tu cheque certificado
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Banco Emisor</Text>
            <TextInput
              style={styles.input}
              value={issuerBank}
              onChangeText={setIssuerBank}
              placeholder="Nombre del banco"
              placeholderTextColor="#9AA0A6"
            />

            <Text style={styles.label}>Titular</Text>
            <TextInput
              style={styles.input}
              value={holder}
              onChangeText={setHolder}
              placeholder="Nombre completo del titular"
              placeholderTextColor="#9AA0A6"
            />

            <Text style={styles.label}>Número de Cheque</Text>
            <TextInput
              style={styles.input}
              value={checkNumber}
              onChangeText={setCheckNumber}
              placeholder="Opcional"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Monto Certificado</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="100000"
                  placeholderTextColor="#9AA0A6"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Moneda</Text>
                <View style={styles.toggle}>
                  <Pressable
                    style={[styles.toggleOption, currency === 'ARS' && styles.toggleOptionActive]}
                    onPress={() => setCurrency('ARS')}
                  >
                    <Text style={[styles.toggleText, currency === 'ARS' && styles.toggleTextActive]}>
                      ARS
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.toggleOption, currency === 'USD' && styles.toggleOptionActive]}
                    onPress={() => setCurrency('USD')}
                  >
                    <Text style={[styles.toggleText, currency === 'USD' && styles.toggleTextActive]}>
                      USD
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Cuadro de aviso importante */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>Importante: </Text>
              El cheque certificado debe ser entregado en nuestras oficinas antes del inicio de la subasta.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Botones Fijos */}
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Guardando...' : 'Registrar Cheque'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        </View>

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
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 24,
  },
  content: {
    width: '100%',
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0A1E3F',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    marginBottom: 16,
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
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  rowItem: {
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    height: 52,
    backgroundColor: '#F9FAFB',
  },
  toggleOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#059669',
  },
  toggleText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  infoBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: 'bold',
  },
  bottomBar: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
  primaryButton: {
    backgroundColor: '#059669',
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
});