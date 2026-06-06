import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostArticleErrorScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✕</Text>
        </View>
        <Text style={styles.title}>No se pudo enviar el artículo</Text>
        <Text style={styles.message}>
          Ocurrió un problema al enviar tu artículo. Por favor intentá de nuevo.
        </Text>

        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            Si el problema persiste, verificá que hayas completado todos los campos
            y adjuntado al menos 6 fotos.
          </Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/post-article')}>
          <Text style={styles.primaryBtnText}>Reintentar</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.secondaryBtnText}>Volver al inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 32, color: '#EF4444' },
  title: { fontSize: 22, fontWeight: '700', color: '#002855', textAlign: 'center' },
  message: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  alertBox: { backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', padding: 16, width: '100%' },
  alertText: { fontSize: 13, color: '#713F12', lineHeight: 18 },
  primaryBtn: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%' },
  secondaryBtnText: { color: '#475569', fontWeight: '600', fontSize: 14 },
});
