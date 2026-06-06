import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { changeInitialPassword, resetPassword } from '@/services/api';

export default function NewPasswordScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ mode?: string }>();
  const mode = searchParams.mode === 'reset' ? 'reset' : 'initial';
  const [currentPassword, setCurrentPassword] = useState('');
  const [token, setToken] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onReset() {
    setServerError(null);
    if (!newPass || newPass.length < 8 || newPass !== confirmPass) {
      setServerError('Las contraseñas deben coincidir y tener al menos 8 caracteres.');
      return;
    }

    if (mode === 'reset' && !token) {
      setServerError('Ingresa el token que recibiste por correo.');
      return;
    }
    if (mode === 'initial' && !currentPassword) {
      setServerError('Ingresa tu contraseña temporal actual.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reset') {
        await resetPassword(token, newPass);
      } else {
        await changeInitialPassword(currentPassword, newPass);
      }
      router.push(mode === 'initial' ? '/payment-methods' : '/home');
    } catch (error: any) {
      setServerError(error?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Nueva Contraseña</ThemedText>
        <ThemedText type="small" style={{ marginTop: 6 }}>
          {mode === 'reset'
            ? 'Ingresa el token recibido por correo y define tu nueva contraseña.'
            : 'Ingresa tu contraseña temporal actual y define una contraseña definitiva.'}
        </ThemedText>

        <View style={{ width: '100%', marginTop: Spacing.four }}>
          {mode === 'reset' ? (
            <>
              <ThemedText style={styles.label}>Token de Restablecimiento</ThemedText>
              <TextInput value={token} onChangeText={setToken} placeholder="token de un solo uso" style={styles.input} autoCapitalize="none" />
            </>
          ) : (
            <>
              <ThemedText style={styles.label}>Contraseña Temporal Actual</ThemedText>
              <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Contraseña temporal" secureTextEntry style={styles.input} />
            </>
          )}

          <ThemedText style={styles.label}>Nueva Contraseña</ThemedText>
          <TextInput value={newPass} onChangeText={setNewPass} placeholder="Mínimo 8 caracteres" secureTextEntry style={styles.input} />

          <ThemedText style={styles.label}>Confirmar Contraseña</ThemedText>
          <TextInput value={confirmPass} onChangeText={setConfirmPass} placeholder="Repite tu contraseña" secureTextEntry style={styles.input} />

          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerTitle}>Error</Text>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          ) : null}

          <Pressable style={styles.primaryButton} onPress={onReset} disabled={loading}>
            <Text style={styles.primaryButtonText}>
              {loading ? 'Enviando...' : 'Restablecer Contraseña'}
            </Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, alignItems: 'center', gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, maxWidth: MaxContentWidth, width: '100%' },
  label: { marginTop: Spacing.two, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E6E9EB', padding: 12, borderRadius: 10, backgroundColor: '#FFF', marginBottom: Spacing.three },
  primaryButton: { backgroundColor: '#F47B1F', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: Spacing.two },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { backgroundColor: '#F6F6F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  secondaryButtonText: { color: '#1A1A1A', fontSize: 15 },
  errorBanner: { backgroundColor: '#FFECEC', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#E74C3C', marginBottom: Spacing.three },
  errorBannerTitle: { fontWeight: '700', marginBottom: 6, color: '#C0392B' },
  errorBannerText: { color: '#7B241C', fontSize: 14 },
});
