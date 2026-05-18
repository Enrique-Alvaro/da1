import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function NewPasswordScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  function onReset() {
    console.log('Reset', { code, newPass, confirmPass });
    // basic checks
    if (!newPass || newPass.length < 8 || newPass !== confirmPass) {
      console.warn('Password requirements not met');
      return;
    }
    router.push('/');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Nueva Contraseña</ThemedText>
        <ThemedText type="small" style={{ marginTop: 6 }}>
          Ingresa el código y tu nueva contraseña
        </ThemedText>

        <View style={{ width: '100%', marginTop: Spacing.four }}>
          <ThemedText style={styles.label}>Código de Verificación</ThemedText>
          <TextInput value={code} onChangeText={setCode} placeholder="000000" style={styles.input} />

          <ThemedText style={styles.label}>Nueva Contraseña</ThemedText>
          <TextInput value={newPass} onChangeText={setNewPass} placeholder="Mínimo 8 caracteres" secureTextEntry style={styles.input} />

          <ThemedText style={styles.label}>Confirmar Contraseña</ThemedText>
          <TextInput value={confirmPass} onChangeText={setConfirmPass} placeholder="Repite tu contraseña" secureTextEntry style={styles.input} />

          <Pressable style={styles.primaryButton} onPress={onReset}>
            <ThemedText type="default" style={styles.primaryButtonText}>Restablecer Contraseña</ThemedText>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
            <ThemedText>Cancelar</ThemedText>
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
});
