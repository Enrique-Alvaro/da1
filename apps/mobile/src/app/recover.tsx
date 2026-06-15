import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { forgotPassword } from '@/services/api';

export default function RecoverScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSend() {
    setServerError(null);
    setSuccessMessage(null);
    if (!email) {
      setServerError('Ingresa tu email para continuar.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccessMessage(res.message);
    } catch (error: any) {
      setServerError(error?.message || 'No se pudo enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Recuperar Contraseña</ThemedText>
        <ThemedText type="small" style={{ marginTop: 6 }}>
          Ingresa tu email para recibir instrucciones
        </ThemedText>

        <View style={{ width: '100%', marginTop: Spacing.four }}>
          <ThemedText style={styles.infoBox}>Te enviaremos un enlace para restablecer tu contraseña al email registrado.</ThemedText>

          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput value={email} onChangeText={setEmail} placeholder="usuario@ejemplo.com" style={styles.input} />

          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerTitle}>Error</Text>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={[styles.infoBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={{ color: '#065F46', lineHeight: 20 }}>{successMessage}</Text>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/new-password?mode=reset')}>
                <ThemedText type="default" style={styles.primaryButtonText}>Ya tengo el código</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.primaryButton} onPress={onSend} disabled={loading}>
              <ThemedText type="default" style={styles.primaryButtonText}>
                {loading ? 'Enviando...' : 'Enviar Instrucciones'}
              </ThemedText>
            </Pressable>
          )}

          <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
            <ThemedText>Volver a Inicio de Sesión</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, alignItems: 'center', gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, maxWidth: MaxContentWidth, width: '100%' },
  infoBox: { backgroundColor: '#EAF3FF', padding: 12, borderRadius: 8, marginBottom: Spacing.three },
  errorBanner: { backgroundColor: '#FFECEC', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#E74C3C', marginBottom: Spacing.three },
  errorBannerTitle: { fontWeight: '700', marginBottom: 6, color: '#C0392B' },
  errorBannerText: { color: '#7B241C', fontSize: 14 },
  label: { marginTop: Spacing.two, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E6E9EB', padding: 12, borderRadius: 10, backgroundColor: '#FFF', marginBottom: Spacing.three },
  primaryButton: { backgroundColor: '#F47B1F', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: Spacing.two },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { backgroundColor: '#F6F6F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
