import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { createPaymentMethod } from '@/services/api';

type CardType = 'tarjeta_credito' | 'tarjeta_credito_extranjera';
type Currency = 'ARS' | 'USD';

const ISSUERS = ['Visa', 'Mastercard', 'American Express', 'Naranja', 'Cabal', 'Otro'];

export default function AddPaymentCardScreen() {
  const router = useRouter();

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
        <ScrollView 
          style={{ width: '100%' }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              {/* Ícono y fondo en azul como solicitaste */}
              <Ionicons name="card-outline" size={36} color="#2563EB" />
            </View>
            <Text style={styles.title}>Agregar Tarjeta de Pago</Text>
            <Text style={styles.subtitle}>
              La empresa verificará tu tarjeta antes de que puedas pujar
            </Text>
          </View>

          {/* Tipo de tarjeta */}
          <View style={styles.section}>
            <Text style={styles.label}>Tipo de tarjeta</Text>
            <View style={styles.toggleContainer}>
              <Pressable
                style={[styles.toggleBtn, tipo === 'tarjeta_credito' && styles.toggleBtnActive]}
                onPress={() => { setTipo('tarjeta_credito'); setMoneda('ARS'); }}
              >
                <Text style={[styles.toggleText, tipo === 'tarjeta_credito' && styles.toggleTextActive]}>
                  Nacional
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, tipo === 'tarjeta_credito_extranjera' && styles.toggleBtnActive]}
                onPress={() => { setTipo('tarjeta_credito_extranjera'); setMoneda('USD'); }}
              >
                <Text style={[styles.toggleText, tipo === 'tarjeta_credito_extranjera' && styles.toggleTextActive]}>
                  Internacional
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Moneda */}
          <View style={styles.section}>
            <Text style={styles.label}>Moneda</Text>
            <View style={styles.toggleContainer}>
              {(['ARS', 'USD'] as Currency[]).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.toggleBtn, moneda === m && styles.toggleBtnActive]}
                  onPress={() => setMoneda(m)}
                >
                  <Text style={[styles.toggleText, moneda === m && styles.toggleTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Titular */}
          <View style={styles.section}>
            <Text style={styles.label}>Nombre del Titular</Text>
            <TextInput
              style={[styles.input, titularError && { borderColor: '#E74C3C' }]}
              value={titular}
              onChangeText={setTitular}
              placeholder="JUAN PEREZ"
              placeholderTextColor="#9AA0A6"
              autoCapitalize="characters"
            />
            {titularError && <Text style={styles.errorText}>Este campo es obligatorio.</Text>}
          </View>

          {/* Entidad emisora */}
          <View style={styles.section}>
            <Text style={styles.label}>Entidad Emisora</Text>
            <Pressable
              style={[styles.input, entidadError && { borderColor: '#E74C3C' }, { justifyContent: 'center' }]}
              onPress={() => setShowIssuers((p) => !p)}
            >
              <Text style={{ color: entidad ? '#1F2937' : '#9AA0A6', fontSize: 16 }}>
                {entidad || 'Seleccionar emisor'}
              </Text>
            </Pressable>
            
            {showIssuers && (
              <View style={styles.optionsBox}>
                {ISSUERS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={styles.optionItem}
                    onPress={() => { setEntidad(opt); setShowIssuers(false); }}
                  >
                    <Text style={{ color: '#1F2937', fontSize: 16 }}>{opt}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {entidadError && <Text style={styles.errorText}>Seleccioná la entidad emisora.</Text>}
          </View>

          {/* Últimos 4 dígitos */}
          <View style={styles.section}>
            <Text style={styles.label}>Últimos 4 dígitos</Text>
            <TextInput
              style={[styles.input, digitosError && { borderColor: '#E74C3C' }]}
              value={ultimosDigitos}
              onChangeText={(t) => setUltimosDigitos(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="3456"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
              maxLength={4}
            />
            {digitosError && <Text style={styles.errorText}>Ingresá exactamente 4 dígitos numéricos.</Text>}
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Por seguridad no almacenamos el número completo ni el CVV de tu tarjeta.
            </Text>
          </View>

          {hasErrors && submitAttempted && (
            <Text style={styles.formError}>Corregí los campos marcados antes de continuar.</Text>
          )}

          <Pressable
            style={[styles.primaryButton, isSubmitting && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Continuar</Text>
            )}
          </Pressable>

          {/* Botón secundario para Cancelar agregado */}
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
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
    backgroundColor: '#EFF6FF', // Azul muy claro
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
    fontSize: 15,
    color: '#6B7280', // Gris
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1E3F',
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#2563EB', // Azul
  },
  toggleText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleTextActive: {
    color: '#FFFFFF',
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
  },
  optionsBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    overflow: 'hidden',
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notice: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#2563EB', // Azul
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
  errorText: {
    color: '#E74C3C',
    marginTop: 6,
    fontSize: 13,
  },
  formError: {
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
});