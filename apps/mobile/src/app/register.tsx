import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { registerUser } from '@/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('AR');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const countries = ['AR', 'US', 'ES', 'CO', 'BR'];

  async function requestPermissions() {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Por favor permite el acceso a cámara y galería en la configuración.');
      return false;
    }
    return true;
  }

  async function pickImage(forWhat: 'front' | 'back', fromCamera = false) {
    const ok = await requestPermissions();
    if (!ok) return;

    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false });
      }
      if (!(result as any).canceled) {
        const uri = (result as any).uri ?? (result as any).assets?.[0]?.uri;
        if (forWhat === 'front') setFrontImage(uri);
        else setBackImage(uri);
      }
    } catch (e) {
      console.warn('Image pick error', e);
    }
  }

  async function onSubmit() {
    setServerError(null);
    if (!firstName || !lastName || !email || !documentId || !address || !frontImage || !backImage || !country) {
      setServerError('Completa todos los campos obligatorios y sube ambas imágenes del documento.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        firstName,
        lastName,
        email,
        documentId,
        address,
        country,
        documentFrontImageUrl: frontImage,
        documentBackImageUrl: backImage,
      });
      router.push('/register-confirmation');
    } catch (error: any) {
      setServerError(error?.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', gap: Spacing.three }}>
          <ThemedText type="title">Crear Cuenta</ThemedText>
          <ThemedText type="small">Únete a CrownBid hoy</ThemedText>

          <View style={{ width: '100%', marginTop: Spacing.four }}>
            <ThemedText style={styles.label}>Nombre</ThemedText>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

            <ThemedText style={styles.label}>Apellido</ThemedText>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

            <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <ThemedText style={styles.label}>Documento</ThemedText>
            <TextInput style={styles.input} value={documentId} onChangeText={setDocumentId} placeholder="DNI / Pasaporte" />

            <ThemedText style={styles.label}>Dirección</ThemedText>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} />

            <ThemedText style={styles.label}>País</ThemedText>
            <Pressable style={[styles.input, styles.selectInput]} onPress={() => {
              const next = countries[(countries.indexOf(country) + 1) % countries.length];
              setCountry(next);
            }}>
              <ThemedText>{country}</ThemedText>
            </Pressable>

            <ThemedText style={styles.label}>Verificación de Identidad</ThemedText>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Pressable style={styles.uploadBox} onPress={() => pickImage('front', false)}>
                  {frontImage ? (
                    <Image source={{ uri: frontImage }} style={styles.preview} />
                  ) : (
                    <ThemedText>Subir imagen del frente del ID</ThemedText>
                  )}
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Pressable style={styles.smallButton} onPress={() => pickImage('front', true)}>
                    <ThemedText>Tomar Foto</ThemedText>
                  </Pressable>
                  <Pressable style={styles.smallButton} onPress={() => pickImage('front', false)}>
                    <ThemedText>Elegir de Galería</ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Pressable style={styles.uploadBox} onPress={() => pickImage('back', false)}>
                  {backImage ? (
                    <Image source={{ uri: backImage }} style={styles.preview} />
                  ) : (
                    <ThemedText>Subir imagen del dorso del ID</ThemedText>
                  )}
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Pressable style={styles.smallButton} onPress={() => pickImage('back', true)}>
                    <ThemedText>Tomar Foto</ThemedText>
                  </Pressable>
                  <Pressable style={styles.smallButton} onPress={() => pickImage('back', false)}>
                    <ThemedText>Elegir de Galería</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>

            {serverError ? (
              <View style={styles.errorBanner}>
                <ThemedText style={styles.errorBannerTitle}>Error</ThemedText>
                <ThemedText>{serverError}</ThemedText>
              </View>
            ) : null}
            <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
              <ThemedText type="default" style={styles.primaryButtonText}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, alignItems: 'center', gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, maxWidth: MaxContentWidth, width: '100%' },
  label: { marginTop: Spacing.two, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E6E9EB', padding: 12, borderRadius: 10, backgroundColor: '#FFF', marginBottom: Spacing.three },
  uploadBox: { borderWidth: 1, borderColor: '#E6E9EB', padding: 16, borderRadius: 8, marginBottom: Spacing.three, alignItems: 'center' },
  selectInput: { backgroundColor: '#F7F7F8' },
  errorBanner: { backgroundColor: '#FFECEC', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#E74C3C', marginBottom: Spacing.three },
  errorBannerTitle: { fontWeight: '700', marginBottom: 6, color: '#C0392B' },
  primaryButton: { backgroundColor: '#F47B1F', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: Spacing.two },
  primaryButtonText: { color: '#fff' },
  preview: { width: '100%', height: 120, borderRadius: 8 },
  smallButton: { backgroundColor: '#F6F6F6', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
});
