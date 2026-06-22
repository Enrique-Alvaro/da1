import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchRegisterCountries, registerUser } from '@/services/api';

type CountryOption = { id: number; name: string; shortName: string | null };

const FALLBACK_COUNTRIES: CountryOption[] = [
  { id: 1, name: 'Argentina', shortName: 'AR' },
  { id: 840, name: 'Estados Unidos', shortName: 'US' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [address, setAddress] = useState('');
  const [countries, setCountries] = useState<CountryOption[]>(FALLBACK_COUNTRIES);
  const [countryId, setCountryId] = useState<number>(FALLBACK_COUNTRIES[0].id);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCountry = countries.find((c) => c.id === countryId) ?? countries[0];

  useEffect(() => {
    fetchRegisterCountries()
      .then((res) => {
        if (res.items.length > 0) {
          setCountries(res.items);
          setCountryId(res.items[0].id);
        }
      })
      .catch(() => {
        // fallback list remains
      });
  }, []);

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
        result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
      }
      if (!(result as any).canceled) {
        const asset = (result as any).assets?.[0];
        const uri = asset?.uri ?? (result as any).uri;
        const base64 = asset?.base64 ?? null;
        if (forWhat === 'front') { setFrontImage(uri); setFrontImageBase64(base64); }
        else { setBackImage(uri); setBackImageBase64(base64); }
      }
    } catch (e) {
      console.warn('Image pick error', e);
    }
  }

  async function onSubmit() {
    setServerError(null);
    if (!firstName || !lastName || !email || !documentNumber || !address || !frontImage || !backImage || !selectedCountry) {
      setServerError('Completa todos los campos obligatorios y sube ambas imágenes del documento.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        firstName,
        lastName,
        email,
        documentNumber,
        address,
        countryId: selectedCountry.id,
        documentFrontImageBase64: frontImageBase64,
        documentBackImageBase64: backImageBase64,
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
        <ScrollView 
          style={{ width: '100%' }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Únete a CrownBid hoy</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Juan" placeholderTextColor="#9AA0A6" />

            <Text style={styles.label}>Apellido</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Pérez" placeholderTextColor="#9AA0A6" />

            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="tu@email.com" placeholderTextColor="#9AA0A6" />

            {/* El documento no está en las imágenes pero es requerido por tu backend */}
            <Text style={styles.label}>Documento</Text>
            <TextInput style={styles.input} value={documentNumber} onChangeText={setDocumentNumber} placeholder="DNI / Pasaporte" placeholderTextColor="#9AA0A6" />

            <Text style={styles.label}>Dirección</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Calle Principal 123, Apto 4B" placeholderTextColor="#9AA0A6" />

            <Text style={styles.label}>País</Text>
            {Platform.OS === 'web' ? (
              <select
                value={String(countryId)}
                onChange={(e) => setCountryId(Number.parseInt((e.target as HTMLSelectElement).value, 10))}
                style={{ borderWidth: 1, borderColor: '#D1D5DB', padding: 14, borderRadius: 8, backgroundColor: '#FFFFFF', marginBottom: 20, fontSize: 16, width: '100%', color: '#1F2937' } as any}
              >
                {countries.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            ) : (
              <>
                <Pressable style={[styles.input, styles.selectInput]} onPress={() => setCountryDropdownOpen(true)}>
                  <Text style={styles.selectText}>{selectedCountry?.name ?? 'Seleccioná un país'}</Text>
                  <Text style={styles.selectChevron}>▾</Text>
                </Pressable>
                <Modal visible={countryDropdownOpen} transparent animationType="slide">
                  <Pressable style={styles.modalOverlay} onPress={() => setCountryDropdownOpen(false)}>
                    <View style={styles.modalSheet}>
                      <Text style={styles.modalTitle}>Seleccioná tu país</Text>
                      <ScrollView>
                        {countries.map((c) => (
                          <Pressable
                            key={c.id}
                            style={styles.modalOption}
                            onPress={() => {
                              setCountryId(c.id);
                              setCountryDropdownOpen(false);
                            }}
                          >
                            <Text style={styles.modalOptionText}>{c.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              </>
            )}

            <View style={styles.separator} />

            <Text style={styles.sectionTitle}>Verificación de Identidad</Text>

            <Text style={styles.labelLight}>Frente del ID</Text>
            <Pressable style={styles.uploadBox} onPress={() => pickImage('front', false)}>
              {frontImage ? (
                <Image source={{ uri: frontImage }} style={styles.preview} />
              ) : (
                <View style={styles.uploadContent}>
                  <Text style={styles.uploadIcon}>⇧</Text>
                  <Text style={styles.uploadText}>Subir imagen del frente del ID</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.labelLight}>Dorso del ID</Text>
            <Pressable style={styles.uploadBox} onPress={() => pickImage('back', false)}>
              {backImage ? (
                <Image source={{ uri: backImage }} style={styles.preview} />
              ) : (
                <View style={styles.uploadContent}>
                  <Text style={styles.uploadIcon}>⇧</Text>
                  <Text style={styles.uploadText}>Subir imagen del dorso del ID</Text>
                </View>
              )}
            </Pressable>

            {serverError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerTitle}>Error</Text>
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            ) : null}

            <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
              <ThemedText>Volver al inicio de sesión</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: BottomTabInset + Spacing.four,
    paddingTop: Spacing.four,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
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
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1E3F',
    marginBottom: 8,
  },
  labelLight: {
    fontSize: 14,
    color: '#0A1E3F',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A1E3F',
    marginBottom: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectInput: {
    backgroundColor: '#FFFFFF',
  },
  selectText: {
    color: '#1F2937',
    fontSize: 16,
  },
  selectChevron: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#002855', marginBottom: 12 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalOptionText: { fontSize: 16, color: '#1F2937' },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
    marginBottom: 24,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 24,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  uploadText: {
    color: '#6B7280',
    fontSize: 14,
  },
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
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
    marginTop: 8,
    marginBottom: Spacing.two,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F6F6F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
});