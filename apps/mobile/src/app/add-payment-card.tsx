import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPaymentMethod } from '@/services/api';

type CardType = 'tarjeta_credito' | 'tarjeta_credito_extranjera';
type Currency = 'ARS' | 'USD';

const ISSUERS = ['Visa', 'Mastercard', 'American Express', 'Naranja', 'Cabal', 'Otro'];

export default function AddPaymentCardScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [tipo, setTipo] = useState<CardType>('tarjeta_credito');
  const [moneda, setMoneda] = useState<Currency>('ARS');
  const [titular, setTitular] = useState('');
  const [entidad, setEntidad] = useState('');
  const [ultimosDigitos, setUltimosDigitos] = useState('');
  const [showIssuers, setShowIssuers] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titularError = submitAttempted && titular.trim().length === 0;
  const entidadError = submitAttempted && entidad.trim().length === 0;
  const digitosError = submitAttempted && !/^\d{4}$/.test(ultimosDigitos.trim());

  const hasErrors = titularError || entidadError || digitosError;

  async function onSubmit() {
    setSubmitAttempted(true);
    if (hasErrors || titular.trim().length === 0 || entidad.trim().length === 0 || !/^\d{4}$/.test(ultimosDigitos.trim())) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createPaymentMethod({
        tipo,
        moneda,
        titular: titular.trim(),
        entidad: entidad.trim(),
        ultimosDigitos: ultimosDigitos.trim(),
      });
      router.push('/payment-verify-success');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo registrar el medio de pago.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Agregar Tarjeta</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            La empresa verificará tu tarjeta antes de que puedas pujar.
          </ThemedText>

          {/* Tipo de tarjeta */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Tipo de tarjeta</ThemedText>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  tipo === 'tarjeta_credito' && { backgroundColor: theme.primary },
                  { borderColor: theme.backgroundSelected },
                ]}
                onPress={() => { setTipo('tarjeta_credito'); setMoneda('ARS'); }}
              >
                <ThemedText style={tipo === 'tarjeta_credito' ? styles.toggleActive : undefined}>
                  Nacional
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleBtn,
                  tipo === 'tarjeta_credito_extranjera' && { backgroundColor: theme.primary },
                  { borderColor: theme.backgroundSelected },
                ]}
                onPress={() => { setTipo('tarjeta_credito_extranjera'); setMoneda('USD'); }}
              >
                <ThemedText style={tipo === 'tarjeta_credito_extranjera' ? styles.toggleActive : undefined}>
                  Internacional
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Moneda */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Moneda</ThemedText>
            <View style={styles.toggleRow}>
              {(['ARS', 'USD'] as Currency[]).map((m) => (
                <Pressable
                  key={m}
                  style={[
                    styles.toggleBtn,
                    moneda === m && { backgroundColor: theme.primary },
                    { borderColor: theme.backgroundSelected },
                  ]}
                  onPress={() => setMoneda(m)}
                >
                  <ThemedText style={moneda === m ? styles.toggleActive : undefined}>{m}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Titular */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Nombre del Titular *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: titularError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
              ]}
              value={titular}
              onChangeText={setTitular}
              placeholder="JUAN PEREZ"
              placeholderTextColor="#9AA0A6"
              autoCapitalize="characters"
            />
            {titularError && <ThemedText style={styles.errorText}>Este campo es obligatorio.</ThemedText>}
          </View>

          {/* Entidad emisora */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Entidad Emisora *</ThemedText>
            <Pressable
              style={[
                styles.selectBox,
                { borderColor: entidadError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
              ]}
              onPress={() => setShowIssuers((p) => !p)}
            >
              <ThemedText>{entidad || 'Seleccionar emisor'}</ThemedText>
            </Pressable>
            {showIssuers && (
              <View style={styles.optionsBox}>
                {ISSUERS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={styles.optionItem}
                    onPress={() => { setEntidad(opt); setShowIssuers(false); }}
                  >
                    <ThemedText>{opt}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
            {entidadError && <ThemedText style={styles.errorText}>Seleccioná la entidad emisora.</ThemedText>}
          </View>

          {/* Últimos 4 dígitos */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Últimos 4 dígitos *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: digitosError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
              ]}
              value={ultimosDigitos}
              onChangeText={(t) => setUltimosDigitos(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="3456"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
              maxLength={4}
            />
            {digitosError && <ThemedText style={styles.errorText}>Ingresá exactamente 4 dígitos numéricos.</ThemedText>}
          </View>

          <View style={styles.notice}>
            <ThemedText type="small" themeColor="textSecondary">
              Por seguridad no almacenamos el número completo ni el CVV de tu tarjeta.
            </ThemedText>
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }, isSubmitting && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="default" style={styles.primaryButtonText}>Registrar Tarjeta</ThemedText>
            )}
          </Pressable>

          {hasErrors && submitAttempted && (
            <ThemedText style={styles.formError}>Corregí los campos marcados antes de continuar.</ThemedText>
          )}
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
  content: { width: '100%', gap: Spacing.four, paddingBottom: Spacing.six },
  subtitle: { marginTop: Spacing.one, marginBottom: Spacing.two },
  section: { width: '100%', gap: Spacing.one },
  label: { marginBottom: 4 },
  toggleRow: { flexDirection: 'row', gap: Spacing.two },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleActive: { color: '#fff', fontWeight: '600' },
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
  optionsBox: {
    borderWidth: 1,
    borderColor: '#E6E9EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  optionItem: { paddingVertical: 12, paddingHorizontal: 14 },
  notice: {
    padding: 12,
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
  },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  errorText: { color: '#E74C3C', marginTop: 4 },
  formError: { color: '#E74C3C', textAlign: 'center', marginTop: Spacing.two },
});
