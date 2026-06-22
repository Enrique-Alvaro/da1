import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Text, // Importamos Text nativo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createSubmission, getAuthToken } from '@/services/api';
import { alertLoginRequired, alertPendingAdmission, resolveClientSession } from '@/utils/clientPermissions';
import { isAllowedSubmissionImageMime, normalizeSubmissionImageMime } from '@/utils/images';

const MIN_IMAGES = 6;
const MAX_IMAGES = 20;

type ImageItem = {
  uri: string;
  base64: string;
  mimeType: string;
  filename: string;
};

export default function PostArticleScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptedOwner, setAcceptedOwner] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedDocumentation, setAcceptedDocumentation] = useState(false);
  const [acceptedReturnCost, setAcceptedReturnCost] = useState(false);
  const [historia, setHistoria] = useState('');
  const [artistaODisenador, setArtistaODisenador] = useState('');
  const [fechaOrigen, setFechaOrigen] = useState('');
  const [componentes, setComponentes] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await resolveClientSession();
      if (!active) return;
      if (session.isGuest) {
        alertLoginRequired(() => router.replace('/login'));
        return;
      }
      if (!session.isAdmitted) {
        alertPendingAdmission();
        router.replace('/home');
        return;
      }
      setAccessChecked(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const imageError = submitAttempted && images.length < MIN_IMAGES;
  const titleError = submitAttempted && title.trim().length === 0;
  const descriptionError = submitAttempted && description.trim().length < 10;
  const declarationError =
    submitAttempted &&
    (!acceptedOwner || !acceptedLegal || !acceptedDocumentation || !acceptedReturnCost);

  function collectValidationErrors(): string | null {
    if (images.length < MIN_IMAGES) {
      return `Debés subir al menos ${MIN_IMAGES} imágenes del artículo.`;
    }
    if (title.trim().length === 0) {
      return 'El nombre del artículo es obligatorio.';
    }
    if (description.trim().length < 10) {
      return 'La descripción debe tener al menos 10 caracteres.';
    }
    if (!acceptedOwner || !acceptedLegal || !acceptedDocumentation || !acceptedReturnCost) {
      return 'Debés aceptar todas las declaraciones obligatorias.';
    }
    const unsupported = images.find((img) => !isAllowedSubmissionImageMime(img.mimeType));
    if (unsupported) {
      return 'Una o más imágenes tienen formato no soportado. Usá JPG, PNG o WebP.';
    }
    const missingBase64 = images.some((img) => !img.base64?.trim());
    if (missingBase64) {
      return 'No se pudieron leer todas las imágenes. Volvé a seleccionarlas.';
    }
    return null;
  }

  async function requestPermissions() {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraStatus.status === 'granted' && mediaStatus.status === 'granted';
  }

  async function pickImage(fromCamera = false) {
    const granted = await requestPermissions();
    if (!granted) return;

    try {
      const pickerOptions = {
        quality: 0.7 as const,
        base64: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync({ ...pickerOptions, allowsMultipleSelection: true });

      if (result.canceled) return;

      const newItems: ImageItem[] = result.assets
        .filter((a) => a.base64)
        .map((a, idx) => ({
          uri: a.uri,
          base64: a.base64!,
          mimeType: normalizeSubmissionImageMime(a.mimeType),
          filename: a.fileName ?? `foto-${Date.now()}-${idx}.jpg`,
        }));

      if (newItems.length === 0) {
        setApiError('No se pudieron leer las imágenes seleccionadas. Probá con JPG o PNG.');
        return;
      }

      const unsupported = newItems.find((item) => !isAllowedSubmissionImageMime(item.mimeType));
      if (unsupported) {
        setApiError('Formato no soportado (por ejemplo HEIC). Elegí fotos en JPG, PNG o WebP.');
        return;
      }

      setApiError(null);
      setImages((prev) => [...prev, ...newItems].slice(0, MAX_IMAGES));
    } catch (error) {
      console.warn('Image picker error', error);
    }
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((item) => item.uri !== uri));
  }

  async function onSubmit() {
    setSubmitAttempted(true);
    setApiError(null);

    const validationError = collectValidationErrors();
    if (validationError) {
      setApiError(validationError);
      return;
    }

    if (!getAuthToken()) {
      setApiError('Sesión expirada. Volvé a iniciar sesión.');
      return;
    }

    const payload = {
      nombre: title.trim(),
      descripcion: description.trim(),
      historia: historia.trim() || undefined,
      artistaODisenador: artistaODisenador.trim() || undefined,
      fechaOrigen: fechaOrigen.trim() || undefined,
      componentes: componentes.trim() || undefined,
      declaracionPropiedad: true as const,
      declaracionSinImpedimentos: true as const,
      origenLicitoDeclarado: true as const,
      declaracionDevolucionACargo: true as const,
      fotos: images.map((img) => ({
        filename: img.filename,
        mimeType: normalizeSubmissionImageMime(img.mimeType),
        base64: img.base64.replace(/^data:[^;]+;base64,/, ''),
      })),
    };

    console.log('[post-article] submit', {
      fotos: payload.fotos.length,
      hasToken: Boolean(getAuthToken()),
    });

    setIsSubmitting(true);
    try {
      await createSubmission(payload);
      router.push('/post-article-success');
    } catch (e: any) {
      console.warn('[post-article] submit error', e);
      setApiError(e?.message || 'No se pudo enviar el artículo. Revisá los datos e intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!accessChecked) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D35400" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Postular Artículo" fallbackRoute="/home" />
      </View>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={{ color: '#000000', marginBottom: 8 }}>
            Tu artículo será evaluado por nuestro equipo antes de ser incluido en una subasta.
          </Text>

          {/* Fotos */}
          <View style={styles.section}>
            <Text style={{ color: '#000000', fontWeight: 'bold' }}>Fotos del Artículo *</Text>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>
              PNG, JPG o WebP — mínimo {MIN_IMAGES}, máximo {MAX_IMAGES}
            </Text>
            <View style={styles.imageRow}>
              {images.map((item) => (
                <View key={item.uri} style={styles.imagePreviewWrap}>
                  <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                  <Pressable style={styles.removeTag} onPress={() => removeImage(item.uri)}>
                    <Text style={{ color: '#000000', fontWeight: 'bold' }}>×</Text>
                  </Pressable>
                </View>
              ))}
              {images.length < MAX_IMAGES && (
                <Pressable
                  style={[
                    styles.uploadButton,
                    { borderColor: imageError ? theme.error : theme.backgroundSelected },
                  ]}
                  onPress={() => pickImage(false)}
                >
                  <Text style={{ color: '#000000' }}>Subir fotos</Text>
                </Pressable>
              )}
            </View>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>
              {images.length}/{MAX_IMAGES} imágenes{images.length < MIN_IMAGES ? ` (mínimo ${MIN_IMAGES})` : ''}
            </Text>
            {imageError && (
              <Text style={styles.errorText}>
                Debes subir al menos {MIN_IMAGES} imágenes del artículo.
              </Text>
            )}
          </View>

          {/* Datos del artículo */}
          <View style={styles.section}>
            <Text style={{ color: '#000000', marginBottom: 6 }}>Nombre del Artículo *</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: titleError ? theme.error : theme.backgroundSelected },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Reloj Vintage 1950"
              placeholderTextColor="#6B7280"
            />
            {titleError && <Text style={styles.errorText}>Este campo es obligatorio.</Text>}

            <Text style={{ color: '#000000', marginBottom: 6 }}>Descripción *</Text>
            <TextInput
              style={[
                styles.textArea,
                { borderColor: descriptionError ? theme.error : theme.backgroundSelected },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe tu artículo en detalle..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
            />
            {descriptionError && (
              <Text style={styles.errorText}>La descripción debe tener al menos 10 caracteres.</Text>
            )}

            <Text style={{ color: '#000000', marginBottom: 6, marginTop: 8 }}>Historia (opcional)</Text>
            <TextInput
              style={styles.textArea}
              value={historia}
              onChangeText={setHistoria}
              placeholder="Contexto, propietarios anteriores, curiosidades..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={3}
            />

            <Text style={{ color: '#000000', marginBottom: 6, marginTop: 8 }}>Artista / diseñador (opcional)</Text>
            <TextInput
              style={styles.input}
              value={artistaODisenador}
              onChangeText={setArtistaODisenador}
              placeholder="Nombre del artista o diseñador"
              placeholderTextColor="#6B7280"
            />

            <Text style={{ color: '#000000', marginBottom: 6, marginTop: 8 }}>Fecha / origen (opcional)</Text>
            <TextInput
              style={styles.input}
              value={fechaOrigen}
              onChangeText={setFechaOrigen}
              placeholder="Ej: 1950, París"
              placeholderTextColor="#6B7280"
            />

            <Text style={{ color: '#000000', marginBottom: 6, marginTop: 8 }}>Componentes (opcional)</Text>
            <TextInput
              style={styles.input}
              value={componentes}
              onChangeText={setComponentes}
              placeholder="Ej: Juego de té de 18 piezas"
              placeholderTextColor="#6B7280"
            />
          </View>

          {/* Declaraciones */}
          <View style={styles.section}>
            <Text style={{ color: '#000000', fontSize: 18, fontWeight: 'bold' }}>Declaraciones Obligatorias</Text>
            {[
              { label: 'Declaro que soy el propietario legítimo del artículo *', state: acceptedOwner, setter: setAcceptedOwner },
              { label: 'Declaro que el artículo no posee impedimentos legales para su venta *', state: acceptedLegal, setter: setAcceptedLegal },
              { label: 'Acepto enviar documentación si la empresa la solicita *', state: acceptedDocumentation, setter: setAcceptedDocumentation },
              { label: 'Acepto que, si la empresa rechaza el artículo enviado a inspección, la devolución será a mi cargo *', state: acceptedReturnCost, setter: setAcceptedReturnCost },
            ].map((item, index) => (
              <View key={index} style={styles.checkboxRow}>
                <Pressable
                  style={[styles.checkbox, { borderColor: theme.backgroundSelected }]}
                  onPress={() => item.setter((p) => !p)}
                >
                  <Text style={{ color: '#000000' }}>{item.state ? '☑' : '☐'}</Text>
                </Pressable>
                <View style={styles.checkboxLabel}>
                  <Text style={{ color: '#000000' }}>{item.label}</Text>
                </View>
              </View>
            ))}
            {declarationError && (
              <Text style={styles.errorText}>Debes aceptar todas las declaraciones obligatorias.</Text>
            )}
          </View>

          {apiError ? (
            <View style={styles.apiErrorBox}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }, isSubmitting && styles.primaryButtonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>Enviar Solicitud</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column', width: '100%', backgroundColor: '#FFFFFF' },
  headerWrap: { width: '100%', alignSelf: 'stretch' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  scroll: { width: '100%' },
  content: { width: '100%', gap: 16, paddingHorizontal: 16, paddingBottom: 50 },
  section: { width: '100%', gap: 8 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  uploadButton: { minWidth: 120, minHeight: 120, borderWidth: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#F3F4F6' },
  imagePreviewWrap: { width: 120, height: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: '100%' },
  removeTag: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  input: { borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#F3F4F6', color: '#000000' },
  textArea: { minHeight: 110, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, textAlignVertical: 'top', backgroundColor: '#F3F4F6', color: '#000000' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  checkboxLabel: { flex: 1 },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  errorText: { color: '#E74C3C', marginTop: 6 },
  apiErrorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  apiErrorText: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
});