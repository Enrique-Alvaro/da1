import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function RecoverScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  function onSend() {
    console.log('Send recover to', email);
    // after sending, route to new-password with a placeholder
  router.push('/new-password' as any);
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

          <Pressable style={styles.primaryButton} onPress={onSend}>
            <ThemedText type="default" style={styles.primaryButtonText}>Enviar Instrucciones</ThemedText>
          </Pressable>

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
  label: { marginTop: Spacing.two, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E6E9EB', padding: 12, borderRadius: 10, backgroundColor: '#FFF', marginBottom: Spacing.three },
  primaryButton: { backgroundColor: '#F47B1F', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: Spacing.two },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { backgroundColor: '#F6F6F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
