import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function PostArticleErrorScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}> 
          <ThemedText type="title">No se pudo enviar tu solicitud</ThemedText>
          <ThemedText type="small" style={styles.message}>
            Ocurrió un problema al enviar tu solicitud. Por favor, inténtalo nuevamente.
          </ThemedText>
          <View style={styles.actions}>
            <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => router.push('/post-article')}>
              <ThemedText type="default" style={styles.buttonText}>
                Reintentar
              </ThemedText>
            </Pressable>
            <Pressable style={[styles.button, styles.outlineButton]} onPress={() => router.push('/explore')}>
              <ThemedText type="default" style={styles.outlineButtonText}>
                Volver al Inicio
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  card: {
    width: '100%',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  message: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  actions: {
    gap: Spacing.two,
  },
  button: {
    backgroundColor: '#F47B1F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
  },
  outlineButton: {
    backgroundColor: '#F5F5F5',
  },
  outlineButtonText: {
    color: '#333',
  },
});
