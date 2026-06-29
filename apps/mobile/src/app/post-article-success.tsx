import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostArticleSuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.centeredState}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📦</Text>
          </View>
          <Text style={styles.title}>¡Artículo enviado!</Text>
          <Text style={styles.message}>
            Tu artículo fue enviado correctamente y está en revisión.
            Te notificaremos cuando sea aceptado.
          </Text>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>¿Qué sigue?</Text>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.stepText}>Artículo enviado ✓</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.stepText}>Revisión por el equipo CrownBid</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: '#E2E8F0' }]} />
              <Text style={[styles.stepText, { color: '#9CA3AF' }]}>Asignación a subasta</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/mis-articulos')}>
          <Text style={styles.primaryBtnText}>Ver mis artículos</Text>
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
  content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  centeredState: { alignItems: 'center', gap: 20, width: '100%' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 36 },
  title: { fontSize: 26, fontWeight: '700', color: '#002855', textAlign: 'center' },
  message: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  stepsCard: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, width: '100%', gap: 12 },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepText: { fontSize: 14, color: '#374151' },
  bottomBar: {
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  primaryBtn: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  secondaryBtnText: { color: '#64748B', fontSize: 14 },
});