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

const categoryOptions = ['Lujo', 'Arte', 'Coleccionables', 'Moda', 'Hogar'];
const countryOptions = ['México', 'Estados Unidos', 'España', 'Colombia', 'Argentina'];

export default function PostArticleScreen() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [acceptedOwner, setAcceptedOwner] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [showCountryOptions, setShowCountryOptions] = useState(false);
  const theme = useTheme();

  const imageCountText = `${images.length}/6 imágenes subidas`;
  const imageError = submitAttempted && images.length < 6;
  const titleError = submitAttempted && title.trim().length === 0;
  const descriptionError = submitAttempted && description.trim().length < 10;
  const categoryError = submitAttempted && !category;
  const locationError = submitAttempted && (!country || !city.trim());
  const declarationError = submitAttempted && (!acceptedOwner || !acceptedLegal || !acceptedTerms);

  const hasErrors = useMemo(
    () => imageError || titleError || descriptionError || categoryError || locationError || declarationError,
    [imageError, titleError, descriptionError, categoryError, locationError, declarationError]
  );

  async function requestPermissions() {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
      return false;
    }
    return true;
  }

  async function pickImage(fromCamera = false) {
    const granted = await requestPermissions();
    if (!granted) return;

    try {
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            base64: false,
            allowsMultipleSelection: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

      if ((result as any).canceled) {
        return;
      }

      const assets = (result as any).assets ?? [(result as any)];
      const uris = assets
        .map((asset: any) => asset.uri)
        .filter((uri: string | undefined): uri is string => typeof uri === 'string');

      setImages((current) => [...current, ...uris].slice(0, 12));
    } catch (error) {
      console.warn('Image picker error', error);
    }
  }

  function removeImage(uri: string) {
    setImages((current) => current.filter((item) => item !== uri));
  }

  async function onSubmit() {
    setSubmitAttempted(true);
    if (hasErrors) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSubmitting(false);

    const outcome = Math.random() < 0.85 ? 'success' : 'error';
    router.push(outcome === 'success' ? '/post-article-success' : '/post-article-error');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
          <ThemedText type="title">Postular Artículo</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Tu artículo será evaluado por nuestro equipo antes de ser incluido en una subasta.
          </ThemedText>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Fotos del Artículo *</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              PNG, JPG hasta 10MB cada una
            </ThemedText>
            <View style={styles.imageRow}>
              {images.map((uri) => (
                <View key={uri} style={styles.imagePreviewWrap}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <Pressable style={styles.removeTag} onPress={() => removeImage(uri)}>
                    <ThemedText type="smallBold" style={styles.removeText}>
                      ×
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={[
                  styles.uploadButton,
                  { borderColor: theme.backgroundSelected, backgroundColor: theme.surface },
                  imageError && { borderColor: theme.error },
                ]}
                onPress={() => pickImage(false)}
              >
                <ThemedText>{images.length >= 6 ? 'Agregar más' : 'Subir fotos'}</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {imageCountText}
            </ThemedText>
            {imageError && <ThemedText style={styles.errorText}>Debes subir al menos 6 imágenes del artículo.</ThemedText>}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>Nombre del Artículo *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: titleError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
                titleError && styles.inputError,
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
                descriptionError && styles.inputError,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe tu artículo en detalle: estado, historia, características..."
              placeholderTextColor="#9AA0A6"
              multiline
              numberOfLines={4}
            />
            {descriptionError && <ThemedText style={styles.errorText}>La descripción debe tener al menos 10 caracteres.</ThemedText>}

            <ThemedText style={styles.label}>Categoría *</ThemedText>
            <Pressable
              style={[
                styles.selectBox,
                { borderColor: categoryError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
                categoryError && styles.inputError,
              ]}
              onPress={() => setShowCategoryOptions((prev) => !prev)}
            >
              <ThemedText>{category || 'Selecciona una categoría'}</ThemedText>
            </Pressable>
            {showCategoryOptions && (
              <View style={styles.optionsBox}>
                {categoryOptions.map((option) => (
                  <Pressable key={option} style={styles.optionButton} onPress={() => {
                    setCategory(option);
                    setShowCategoryOptions(false);
                  }}>
                    <ThemedText>{option}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
            {categoryError && <ThemedText style={styles.errorText}>Debes elegir una categoría.</ThemedText>}

            <ThemedText style={styles.label}>Ubicación *</ThemedText>
            <Pressable
              style={[
                styles.selectBox,
                { borderColor: locationError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
                locationError && styles.inputError,
              ]}
              onPress={() => setShowCountryOptions((prev) => !prev)}
            >
              <ThemedText>{country || 'Seleccionar país'}</ThemedText>
            </Pressable>
            {showCountryOptions && (
              <View style={styles.optionsBox}>
                {countryOptions.map((option) => (
                  <Pressable key={option} style={styles.optionButton} onPress={() => {
                    setCountry(option);
                    setShowCountryOptions(false);
                  }}>
                    <ThemedText>{option}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
            <TextInput
              style={[
                styles.input,
                { borderColor: locationError ? theme.error : theme.backgroundSelected, backgroundColor: theme.surface },
                locationError && styles.inputError,
              ]}
              value={city}
              onChangeText={setCity}
              placeholder="Ciudad de México"
              placeholderTextColor="#9AA0A6"
            />
            {locationError && <ThemedText style={styles.errorText}>Ingresa país y ciudad válidos.</ThemedText>}
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Declaraciones Obligatorias</ThemedText>
            <View style={styles.checkboxRow}>
              <Pressable style={[styles.checkbox, { borderColor: theme.backgroundSelected }]} onPress={() => setAcceptedOwner((prev) => !prev)}>
                <ThemedText>{acceptedOwner ? '☑' : '☐'}</ThemedText>
              </Pressable>
              <View style={styles.checkboxLabel}>
                <ThemedText>Declaro que soy el propietario legítimo del artículo *</ThemedText>
              </View>
            </View>
            <View style={styles.checkboxRow}>
              <Pressable style={[styles.checkbox, { borderColor: theme.backgroundSelected }]} onPress={() => setAcceptedLegal((prev) => !prev)}>
                <ThemedText>{acceptedLegal ? '☑' : '☐'}</ThemedText>
              </Pressable>
              <View style={styles.checkboxLabel}>
                <ThemedText>Declaro que el artículo no posee impedimentos legales para su venta *</ThemedText>
              </View>
            </View>
            <View style={styles.checkboxRow}>
              <Pressable style={[styles.checkbox, { borderColor: theme.backgroundSelected }]} onPress={() => setAcceptedTerms((prev) => !prev)}>
                <ThemedText>{acceptedTerms ? '☑' : '☐'}</ThemedText>
              </Pressable>
              <View style={styles.checkboxLabel}>
                <ThemedText>Acepto condiciones de envío y devolución en caso de rechazo *</ThemedText>
              </View>
            </View>
            {declarationError && <ThemedText style={styles.errorText}>Debes aceptar todas las declaraciones obligatorias.</ThemedText>}
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

          {hasErrors && (
            <ThemedText style={styles.formError}>
              Revisa los datos marcados antes de enviar tu solicitud.
            </ThemedText>
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
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  section: {
    width: '100%',
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  uploadButton: {
    minWidth: 120,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  imagePreviewWrap: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
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
  removeText: {
    color: '#333',
  },
  label: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DADADA',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#DADADA',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#DADADA',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  optionsBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6E9EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#FF7A00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
  },
  errorText: {
    color: '#E74C3C',
    marginTop: 6,
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  errorBorder: {
    borderColor: '#E74C3C',
  },
  formError: {
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
