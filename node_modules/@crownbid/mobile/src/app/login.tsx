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
  const [clickedRecover, setClickedRecover] = useState(false);
  const [clickedGuest, setClickedGuest] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailError = emailTouched || submitAttempted ? !isValidEmail(email) && email.length > 0 : false;
  const showTopError = submitAttempted && (!email || !isValidEmail(email));

  // robust navigation helper: try router.push, then if path doesn't change on web, force full navigation
  async function navigateTo(path: string) {
    try {
      const before = Platform.OS === 'web' ? (window as any).location.pathname : null;
      console.log('navigateTo before', path, before);
      // attempt normal router navigation
      router.push(path as any);
      // wait a bit to let router change
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
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <ThemedText>👑</ThemedText>
          </View>
        </View>

        <ThemedText type="title">CrownBid</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Iniciar Sesión
        </ThemedText>

        {showTopError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Formato de email inválido</Text>
            <Text style={styles.errorBannerText}>Por favor ingresa un email válido (ej: usuario@ejemplo.com)</Text>
          </View>
        )}
        {serverError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Error</Text>
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="usuario@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, emailError ? styles.inputError : undefined]}
            placeholderTextColor="#9AA0A6"
            onBlur={() => setEmailTouched(true)}
          />
          {emailError && <ThemedText style={styles.fieldError}>Email inválido</ThemedText>}

          <ThemedText style={styles.label}>Contraseña</ThemedText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder=""
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
            <ThemedText type="default" style={styles.primaryButtonText}>
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </ThemedText>
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
            <ThemedText style={styles.secondaryButtonText}>{clickedGuest ? '...' : 'Continuar como Invitado'}</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              console.log('press: olvidaste contraseña');
              setClickedRecover(true);
              setTimeout(() => setClickedRecover(false), 700);
              navigateTo('/recover');
            }}
          >
            <ThemedText style={styles.forgot}>{clickedRecover ? '...' : '¿Olvidaste tu contraseña?'}</ThemedText>
          </Pressable>

          <View style={styles.registerRow}>
            <ThemedText>¿No tienes una cuenta? </ThemedText>
            <Pressable
              onPress={() => {
                console.log('press: registrate');
                setClickedRegister(true);
                setTimeout(() => setClickedRegister(false), 700);
                navigateTo('/register');
              }}
            >
              <ThemedText style={styles.registerLink}>{clickedRegister ? '...' : 'Regístrate'}</ThemedText>
            </Pressable>
          </View>

        </View>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  avatarWrap: {
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  subtitle: {
    marginTop: 6,
  },
  form: {
    width: '100%',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  errorBanner: {
    backgroundColor: '#FFECEC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    width: '100%',
  },
  errorBannerText: { color: '#7B241C', fontSize: 14 },
  errorBannerTitle: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#C0392B',
  },
  label: {
    marginBottom: 6,
    marginLeft: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E6E9EB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  fieldError: {
    color: '#E74C3C',
    marginTop: 6,
    marginLeft: 6,
  },
  primaryButton: {
    marginTop: Spacing.three,
    backgroundColor: '#F47B1F',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderColor: '#E6E9EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
  },
  secondaryButtonText: {
    color: '#333',
  },
  forgot: {
    marginTop: Spacing.two,
    color: '#1E90FF',
    textAlign: 'center',
  },
  registerRow: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  registerLink: {
    color: '#F47B1F',
  },
});
