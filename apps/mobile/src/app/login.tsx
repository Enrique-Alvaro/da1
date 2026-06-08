import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { login } from '@/services/api';

function isValidEmail(email: string) {
  // simple email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginScreen() {
  const router = useRouter();
  const [clickedRegister, setClickedRegister] = useState(false);
  const [clickedGuest, setClickedGuest] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailError = emailTouched || submitAttempted ? !isValidEmail(email) && email.length > 0 : false;
  const showTopError = submitAttempted && (!email || !isValidEmail(email));

  // robust navigation helper
  async function navigateTo(path: string) {
    try {
      const before = Platform.OS === 'web' ? (window as any).location.pathname : null;
      console.log('navigateTo before', path, before);
      router.push(path as any);
      await new Promise((r) => setTimeout(r, 300));
      const after = Platform.OS === 'web' ? (window as any).location.pathname : null;
      console.log('navigateTo after', path, after);
      if (Platform.OS === 'web' && after !== path) {
        console.log('navigateTo fallback to assign', path);
        (window as any).location.assign(path);
      }
    } catch (e) {
      console.warn('navigateTo error', e);
      if (Platform.OS === 'web') (window as any).location.assign(path);
    }
  }

  async function onSubmit() {
    setSubmitAttempted(true);
    if (!email || !password || !isValidEmail(email)) {
      console.warn('Validation failed');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const response = await login(email, password);
      if (response.mustChangePassword || response.isFirstLogin) {
        router.push('/new-password?mode=initial');
        return;
      }
      router.push('/home');
    } catch (error: any) {
      setServerError(error?.message || 'Error de autenticación. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Avatar restaurado */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.emoji}>👑</Text>
          </View>
        </View>

        {/* Título actualizado */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>CrownBid</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>

        {showTopError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Formato de email inválido</Text>
            <Text style={styles.errorBannerText}>Por favor ingresa un email válido (ej: tu@email.com)</Text>
          </View>
        )}
        {serverError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Error</Text>
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, emailError ? styles.inputError : undefined]}
            placeholderTextColor="#9AA0A6"
            onBlur={() => setEmailTouched(true)}
          />
          {emailError && <Text style={styles.fieldError}>Email inválido</Text>}

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>
              {loading ? 'Cargando...' : 'Entrar'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              console.log('press: continuar como invitado');
              setClickedGuest(true);
              setTimeout(() => setClickedGuest(false), 700);
              navigateTo('/home');
            }}
          >
            <Text style={styles.secondaryButtonText}>{clickedGuest ? '...' : 'Continuar como Invitado'}</Text>
          </Pressable>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
          <Pressable
            onPress={() => {
              console.log('press: registrate');
              setClickedRegister(true);
              setTimeout(() => setClickedRegister(false), 700);
              navigateTo('/register');
            }}
          >
            <Text style={styles.registerLink}>{clickedRegister ? '...' : 'Regístrate'}</Text>
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
    justifyContent: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  // Estilos del avatar agregados nuevamente
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1D9', // Fondo cremita/naranja claro
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0A1E3F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    width: '100%',
  },
  errorBanner: {
    backgroundColor: '#FFECEC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    width: '100%',
    marginBottom: 16,
  },
  errorBannerText: { color: '#7B241C', fontSize: 14 },
  errorBannerTitle: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#C0392B',
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
  inputError: {
    borderColor: '#E74C3C',
  },
  fieldError: {
    color: '#E74C3C',
    marginTop: -14,
    marginBottom: 14,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#E67E22',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0A1E3F',
    fontSize: 16,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  registerText: {
    color: '#6B7280',
    fontSize: 15,
  },
  registerLink: {
    color: '#E67E22',
    fontSize: 15,
    fontWeight: 'bold',
  },
});