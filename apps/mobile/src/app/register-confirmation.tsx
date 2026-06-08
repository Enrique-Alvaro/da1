import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';

export default function RegisterConfirmation() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          {/* Ícono circular */}
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={44} color="#E67E22" />
          </View>

          {/* Textos */}
          <Text style={styles.title}>
            Te hemos enviado un correo{'\n'}de confirmación
          </Text>
          
          <Text style={styles.subtitle}>
            Por favor revisa tu correo electrónico para{'\n'}continuar el proceso de registro
          </Text>

          {/* Botón */}
          <Pressable style={styles.primaryButton} onPress={() => router.push('/')}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
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
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: BottomTabInset,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF1D9', // Naranja/cremita muy claro
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0A1E3F', // Azul marino oscuro
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280', // Gris
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#E67E22', // Naranja
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});