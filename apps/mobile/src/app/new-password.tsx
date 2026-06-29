import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordInput } from '@/components/PasswordInput';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';
import { changeInitialPassword, resetPassword } from '@/services/api';

export default function NewPasswordScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ mode?: string; token?: string }>();
  const mode = searchParams.mode === 'reset' ? 'reset' : 'initial';
  const [currentPassword, setCurrentPassword] = useState('');
  const [token, setToken] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof searchParams.token === 'string' && searchParams.token.trim()) {
      setToken(searchParams.token.trim());
    }
  }, [searchParams.token]);

  const hasUpper = /[A-Z]/.test(newPass);
  const hasLower = /[a-z]/.test(newPass);
  const isMinLength = newPass.length >= 8;
  const isMatch = newPass === confirmPass && newPass.length > 0;
  const hasInitialRequirement = mode === 'reset' ? token.length > 0 : currentPassword.length > 0;

  const isFormValid = hasUpper && hasLower && isMinLength && isMatch && hasInitialRequirement;

  async function onReset() {
    setServerError(null);
    
    if (!isFormValid) {
      setServerError('Asegúrate de cumplir todos los requisitos de la contraseña.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reset') {
        await resetPassword(token, newPass);
      } else {
        await changeInitialPassword(currentPassword, newPass);
      }
      router.push('/home');
    } catch (error: any) {
      setServerError(error?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Crea tu Contraseña</Text>
          <Text style={styles.subtitle}>
            Establece una contraseña segura para tu cuenta
          </Text>
        </View>

        <View style={styles.form}>
          
          {mode === 'reset' ? (
            <>
              <Text style={styles.label}>Token de Restablecimiento</Text>
              <TextInput 
                value={token} 
                onChangeText={setToken} 
                placeholder="Ingresa el código de tu correo" 
                style={styles.input} 
                autoCapitalize="none" 
                placeholderTextColor="#9AA0A6"
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Contraseña Temporal Actual</Text>
              <PasswordInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                style={styles.input}
              />
            </>
          )}

          <Text style={styles.label}>Contraseña</Text>
          <PasswordInput
            value={newPass}
            onChangeText={setNewPass}
            placeholder="••••••••"
            style={styles.input}
          />

          <Text style={styles.label}>Confirmar Contraseña</Text>
          <PasswordInput
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="••••••••"
            style={styles.input}
          />

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Requisitos de Contraseña:</Text>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementIcon, hasUpper && styles.requirementMet]}>
                {hasUpper ? '✓' : '✕'}
              </Text>
              <Text style={styles.requirementText}>Al menos una letra mayúscula</Text>
            </View>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementIcon, hasLower && styles.requirementMet]}>
                {hasLower ? '✓' : '✕'}
              </Text>
              <Text style={styles.requirementText}>Al menos una letra minúscula</Text>
            </View>

            <View style={styles.requirementRow}>
              <Text style={[styles.requirementIcon, isMinLength && styles.requirementMet]}>
                {isMinLength ? '✓' : '✕'}
              </Text>
              <Text style={styles.requirementText}>Mínimo 8 caracteres</Text>
            </View>
          </View>

          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerTitle}>Error</Text>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          ) : null}

          <Pressable 
            style={[styles.primaryButton, !isFormValid && styles.primaryButtonDisabled]} 
            onPress={onReset} 
            disabled={loading || !isFormValid}
          >
            <Text style={[styles.primaryButtonText, !isFormValid && styles.primaryButtonTextDisabled]}>
              {loading ? 'Enviando...' : 'Confirmar Contraseña'}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A1E3F', 
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280', 
    textAlign: 'center',
  },
  form: {
    width: '100%',
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
  requirementsBox: {
    backgroundColor: '#F9FAFB', 
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0A1E3F',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementIcon: {
    fontSize: 14,
    color: '#9CA3AF', 
    marginRight: 8,
    fontWeight: 'bold',
    width: 16,
  },
  requirementMet: {
    color: '#10B981', 
  },
  requirementText: {
    fontSize: 14,
    color: '#4B5563', 
  },
  errorBanner: {
    backgroundColor: '#FFECEC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    marginBottom: 20,
  },
  errorBannerTitle: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#C0392B',
  },
  errorBannerText: {
    color: '#7B241C',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#E67E22', 
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D1D5DB', 
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryButtonTextDisabled: {
    color: '#6B7280', 
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
});