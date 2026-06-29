import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentVerifyErrorScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.centeredState}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✕</Text>
          </View>
          <Text style={styles.title}>No se pudo registrar el medio de pago</Text>
          <Text style={styles.message}>
            Ocurrió un error al registrar tu método de pago. Verificá los datos
            ingresados e intentá de nuevo.
          </Text>

          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Recordá</Text>
            <Text style={styles.alertText}>
              Necesitás al menos un medio de pago verificado para participar en subastas.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/select-payment-method')}>
          <Text style={styles.primaryBtnText}>Intentar con otro método</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/payment-methods')}>
          <Text style={styles.secondaryBtnText}>Ver mis métodos de pago</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  centeredState: { alignItems: 'center', gap: 20, width: '100%' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 32, color: '#EF4444' },
  title: { fontSize: 22, fontWeight: '700', color: '#002855', textAlign: 'center' },
  message: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  alertBox: { backgroundColor: '#FEF9C3', borderRadius: 12, borderWidth: 1, borderColor: '#FDE047', padding: 16, width: '100%', gap: 6 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#854D0E' },
  alertText: { fontSize: 13, color: '#713F12', lineHeight: 18 },
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
  secondaryBtn: { borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%' },
  secondaryBtnText: { color: '#475569', fontWeight: '600', fontSize: 14 },
});