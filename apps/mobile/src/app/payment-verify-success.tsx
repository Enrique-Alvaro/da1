import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentVerifySuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.centeredState}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>
          <Text style={styles.title}>¡Medio de pago registrado!</Text>
          <Text style={styles.message}>
            Tu medio de pago fue registrado exitosamente. El equipo lo verificará
            antes de que puedas participar en subastas.
          </Text>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusDot}>●</Text>
              <Text style={styles.statusText}>Datos registrados</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusDot, { color: '#F59E0B' }]}>●</Text>
              <Text style={styles.statusText}>Verificación pendiente por CrownBid</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/payment-methods')}>
          <Text style={styles.primaryBtnText}>Ver mis métodos de pago</Text>
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
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 36, color: '#10B981' },
  title: { fontSize: 24, fontWeight: '700', color: '#002855', textAlign: 'center' },
  message: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  statusCard: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, width: '100%', gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { color: '#10B981', fontSize: 12 },
  statusText: { fontSize: 14, color: '#374151' },
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