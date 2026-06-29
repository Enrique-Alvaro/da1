import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordInput } from '@/components/PasswordInput';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';
import { login } from '@/services/api';
import { isValidEmail, normalizeEmail } from '@/utils/email';

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

  const normalizedEmail = normalizeEmail(email);
  const emailError =
    emailTouched || submitAttempted ? normalizedEmail.length > 0 && !isValidEmail(email) : false;
  const showTopError =
    submitAttempted &&
    (normalizedEmail.length === 0
      ? true
      : !isValidEmail(email));
  const topErrorMessage =
    submitAttempted && normalizedEmail.length === 0
      ? 'Ingresá tu correo electrónico para continuar.'
      : 'Por favor ingresa un email válido (ej: tu@email.com)';

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
    if (!normalizedEmail || !password || !isValidEmail(email)) {
      console.warn('Validation failed');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const response = await login(normalizedEmail, password);
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.emoji}>👑</Text>
          </View>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>CrownBid</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>

        {showTopError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>
              {normalizedEmail.length === 0 ? 'Correo requerido' : 'Formato de email inválido'}
            </Text>
            <Text style={styles.errorBannerText}>{topErrorMessage}</Text>
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
            onBlur={() => {
              setEmailTouched(true);
              setEmail((value) => value.trim());
            }}
          />
          {emailError && <Text style={styles.fieldError}>Email inválido</Text>}

          <Text style={styles.label}>Contraseña</Text>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            style={styles.input}
          />

          <Pressable onPress={() => navigateTo('/recover')} style={styles.forgotLinkWrap}>
            <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

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
            <Text style={styles.secondaryButtonText}>
              {clickedGuest ? '...' : 'Continuar como Invitado'}
            </Text>
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
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1D9', 
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
  forgotLinkWrap: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -8 },
  forgotLink: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
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