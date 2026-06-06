import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { registerUser } from '@/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  // Estado para controlar el menú desplegable de países
  const [country, setCountry] = useState('Selecciona un país');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const countries = ['Argentina', 'Estados Unidos', 'España', 'Colombia', 'Brasil'];

  // Función simplificada para abrir la galería directo (ideal para web y móvil)
  async function pickImage(side: 'front' | 'back') {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
      }
      if (!(result as any).canceled) {
        const asset = (result as any).assets?.[0] ?? result;
        const base64 = asset?.base64;
        if (typeof base64 === 'string' && base64.trim().length > 0) {
          if (forWhat === 'front') setFrontImage(base64);
          else setBackImage(base64);
        } else {
          Alert.alert('Error', 'No se pudo leer la imagen en Base64. Intenta otra imagen.');
        }
      }
    } catch (e) {
      console.warn('Error al seleccionar imagen', e);
    }
  }

  function getPreviewUri(base64: string | null) {
    if (!base64) return undefined;
    return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  }

  async function onSubmit() {
    setServerError(null);
    if (!firstName || !lastName || !email || !address || country === 'Selecciona un país' || !frontImage || !backImage) {
      setServerError('Completa todos los campos obligatorios y sube ambas imágenes del DNI.');
      return;
    }

    const countryCodeToId: Record<string, number> = {
      AR: 1,
      US: 2,
      ES: 3,
      CO: 4,
      BR: 5,
    };
    const countryId = countryCodeToId[country] ?? 1;

    setLoading(true);
    try {
      await registerUser({
        firstName,
        lastName,
        email,
        documentNumber: documentId,
        address,
        countryId,
        documentFrontImageBase64: frontImage,
        documentBackImageBase64: backImage,
      });
      router.push('/register-confirmation');
    } catch (error: any) {
      setServerError(error?.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a CrownBid hoy</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} placeholder="Juan" placeholderTextColor="#999" value={firstName} onChangeText={setFirstName} />

          <Text style={styles.label}>Apellido</Text>
          <TextInput style={styles.input} placeholder="Pérez" placeholderTextColor="#999" value={lastName} onChangeText={setLastName} />

          <Text style={styles.label}>Correo Electrónico</Text>
          {/* Cambiado a @gmail.com como pediste */}
          <TextInput style={styles.input} placeholder="tu@gmail.com" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Dirección</Text>
          {/* Cambiado el placeholder para que sea solo la calle y número */}
          <TextInput style={styles.input} placeholder="Av. Corrientes 1234" placeholderTextColor="#999" value={address} onChangeText={setAddress} />

          <Text style={styles.label}>País</Text>
          {/* Implementación del Menú Desplegable */}
          <View style={{ position: 'relative', zIndex: 10, marginBottom: 20 }}>
            <Pressable style={[styles.input, styles.selectInput, { marginBottom: 0 }]} onPress={() => setShowDropdown(!showDropdown)}>
              <Text style={{ color: country === 'Selecciona un país' ? '#999' : '#333', fontSize: 16 }}>{country}</Text>
              <Text style={{ color: '#002855', fontWeight: 'bold' }}>{showDropdown ? '⌃' : '⌄'}</Text>
            </Pressable>
            
            {showDropdown && (
              <View style={styles.dropdownMenu}>
                {countries.map((c) => (
                  <Pressable 
                    key={c} 
                    style={styles.dropdownItem} 
                    onPress={() => { setCountry(c); setShowDropdown(false); }}
                  >
                    <Text style={styles.dropdownItemText}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Sección de Documentos con DNI en vez de ID */}
          <Text style={styles.sectionLabel}>Verificación de Identidad</Text>
          
          <Text style={styles.label}>Frente del DNI</Text>
          <Pressable style={styles.dashedBox} onPress={() => pickImage('front')}>
            {frontImage ? (
              <Image source={{ uri: frontImage }} style={styles.preview} />
            ) : (
              <>
                <Text style={styles.uploadIcon}>↑</Text>
                <Text style={styles.uploadText}>Subir imagen del frente del DNI</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.label}>Dorso del DNI</Text>
          <Pressable style={styles.dashedBox} onPress={() => pickImage('back')}>
            {backImage ? (
              <Image source={{ uri: backImage }} style={styles.preview} />
            ) : (
              <>
                <Text style={styles.uploadIcon}>↑</Text>
                <Text style={styles.uploadText}>Subir imagen del dorso del DNI</Text>
              </>
            )}
          </Pressable>

          {serverError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerTitle}>Error</Text>
              <Text style={{ color: '#333' }}>{serverError}</Text>
            </View>
          )}

          <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { paddingHorizontal: 20, paddingTop: 10 },
  backButton: { padding: 5, width: 40 },
  backIcon: { fontSize: 24, color: '#002855' },
  
  scrollContent: { paddingHorizontal: 25, paddingBottom: 40 },
  
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#002855' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  
  formContainer: { width: '100%' },
  
  label: { fontSize: 14, fontWeight: 'bold', color: '#002855', marginBottom: 8 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#002855', marginTop: 10, marginBottom: 15 },
  
  input: { borderWidth: 1, borderColor: '#E6E9EB', borderRadius: 10, padding: 15, fontSize: 16, color: '#333', backgroundColor: '#FFF', marginBottom: 20 },
  selectInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  /* Estilos del Menú Desplegable (Dropdown) */
  dropdownMenu: { position: 'absolute', top: 55, left: 0, right: 0, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E9EB', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, zIndex: 100 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 16, color: '#333' },

  dashedBox: { borderWidth: 1, borderColor: '#B0B5BE', borderStyle: 'dashed', borderRadius: 10, padding: 30, alignItems: 'center', backgroundColor: '#F8F9FA', marginBottom: 20 },
  uploadIcon: { fontSize: 24, color: '#888', marginBottom: 10 },
  uploadText: { color: '#002855', fontSize: 14 },
  preview: { width: '100%', height: 150, borderRadius: 8, resizeMode: 'cover' },
  
  errorBanner: { backgroundColor: '#FFECEC', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#E74C3C', marginBottom: 20 },
  errorBannerTitle: { fontWeight: 'bold', marginBottom: 6, color: '#C0392B' },
  
  primaryButton: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});