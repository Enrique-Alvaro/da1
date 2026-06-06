import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createSubmission } from '@/services/api';

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const imageError = submitAttempted && images.length < MIN_IMAGES;
  const titleError = submitAttempted && title.trim().length === 0;
  const descriptionError = submitAttempted && description.trim().length < 10;
  const declarationError = submitAttempted && (!acceptedOwner || !acceptedLegal || !acceptedTerms);

  const hasErrors = useMemo(
    () => imageError || titleError || descriptionError || declarationError,
    [imageError, titleError, descriptionError, declarationError]
  );

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
          mimeType: a.mimeType ?? 'image/jpeg',
          filename: a.fileName ?? `foto-${Date.now()}-${idx}.jpg`,
        }));

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
    if (hasErrors) return;

    setIsSubmitting(true);
    try {
      await createSubmission({
        nombre: title.trim(),
        descripcion: description.trim(),
        declaracionPropiedad: true,
        declaracionSinImpedimentos: true,
        origenLicitoDeclarado: true,
        fotos: images.map((img) => ({
          filename: img.filename,
          mimeType: img.mimeType,
          base64: img.base64,
        })),
      });
      router.push('/post-article-success');
    } catch (e: any) {
      setApiError(e?.message || 'No se pudo enviar el artículo. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Postular Artículo</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Tu artículo será evaluado por nuestro equipo antes de ser incluido en una subasta.
          </ThemedText>

          {/* Fotos */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Fotos del Artículo *</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              PNG, JPG o WebP — mínimo {MIN_IMAGES}, máximo {MAX_IMAGES}
            </ThemedText>
            <View style={styles.imageRow}>
              {images.map((item) => (
                <View key={item.uri} style={styles.imagePreviewWrap}>
                  <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                  <Pressable style={styles.removeTag} onPress={() => removeImage(item.uri)}>
                    <ThemedText type="smallBold" style={styles.removeText}>×</ThemedText>
                  </Pressable>
                </View>
              ))}
              {images.length < MAX_IMAGES && (
                <Pressable
                  style={[
                    styles.uploadButton,
                    { borderColor: imageError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
                  ]}
                  onPress={() => pickImage(false)}
                >
                  <ThemedText>Subir fotos</ThemedText>
                </Pressable>
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {images.length}/{MAX_IMAGES} imágenes{images.length < MIN_IMAGES ? ` (mínimo ${MIN_IMAGES})` : ''}
            </ThemedText>
            {imageError && (
              <ThemedText style={styles.errorText}>
                Debes subir al menos {MIN_IMAGES} imágenes del artículo.
              </ThemedText>
            )}
          </View>

          {/* Datos del artículo */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Nombre del Artículo *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: titleError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Reloj Vintage 1950"
              placeholderTextColor="#9AA0A6"
            />
            {titleError && <ThemedText style={styles.errorText}>Este campo es obligatorio.</ThemedText>}

            <ThemedText style={styles.label}>Descripción *</ThemedText>
            <TextInput
              style={[
                styles.textArea,
                { borderColor: descriptionError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe tu artículo en detalle: estado, historia, características..."
              placeholderTextColor="#9AA0A6"
              multiline
              numberOfLines={4}
            />
            {descriptionError && (
              <ThemedText style={styles.errorText}>La descripción debe tener al menos 10 caracteres.</ThemedText>
            )}
          </View>

          {/* Declaraciones */}
          <View style={styles.section}>
            <ThemedText type="subtitle">Declaraciones Obligatorias</ThemedText>
            <View style={styles.checkboxRow}>
              <Pressable
                style={[styles.checkbox, { borderColor: theme.backgroundSelected }]}
                onPress={() => setAcceptedOwner((p) => !p)}
              >
                <ThemedText>{acceptedOwner ? '☑' : '☐'}</ThemedText>
              </Pressable>
              <View style={styles.checkboxLabel}>
                <ThemedText>Declaro que soy el propietario legítimo del artículo *</ThemedText>
              </View>
            </View>
            <View style={styles.checkboxRow}>
              <Pressable
                style={[styles.checkbox, { borderColor: theme.backgroundSelected }]}
                onPress={() => setAcceptedLegal((p) => !p)}
              >
                <ThemedText>{acceptedLegal ? '☑' : '☐'}</ThemedText>
              </Pressable>
              <View style={styles.checkboxLabel}>
                <ThemedText>Declaro que el artículo no posee impedimentos legales para su venta *</ThemedText>
              </View>
            </View>
            <View style={styles.checkboxRow}>
              <Pressable
                style={[styles.checkbox, { borderColor: theme.backgroundSelected }]}
                onPress={() => setAcceptedTerms((p) => !p)}
              >
                <ThemedText>{acceptedTerms ? '☑' : '☐'}</ThemedText>
              </Pressable>
              <View style={styles.checkboxLabel}>
                <ThemedText>Acepto condiciones de envío y devolución en caso de rechazo *</ThemedText>
              </View>
            </View>
            {declarationError && (
              <ThemedText style={styles.errorText}>Debes aceptar todas las declaraciones obligatorias.</ThemedText>
            )}
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }, isSubmitting && styles.primaryButtonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="default" style={styles.primaryButtonText}>
                Enviar Solicitud
              </ThemedText>
            )}
          </Pressable>

          {hasErrors && submitAttempted && (
            <ThemedText style={styles.formError}>
              Revisa los datos marcados antes de enviar tu solicitud.
            </ThemedText>
          )}

          {apiError && (
            <View style={styles.apiErrorBox}>
              <ThemedText style={styles.apiErrorText}>{apiError}</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  content: {
    width: '100%',
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  subtitle: { marginTop: Spacing.one, marginBottom: Spacing.two },
  section: { width: '100%', gap: Spacing.two },
  sectionTitle: { marginBottom: 8 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  uploadButton: {
    minWidth: 120,
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  imagePreviewWrap: { width: 120, height: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: '100%' },
  removeTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: '#333' },
  label: { marginBottom: 6 },
  input: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    textAlignVertical: 'top',
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  checkboxLabel: { flex: 1 },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff' },
  errorText: { color: '#E74C3C', marginTop: 6 },
  formError: { color: '#E74C3C', textAlign: 'center', marginTop: Spacing.two },
  apiErrorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 14,
    marginTop: Spacing.two,
  },
  apiErrorText: { color: '#DC2626', fontSize: 14 },
});
