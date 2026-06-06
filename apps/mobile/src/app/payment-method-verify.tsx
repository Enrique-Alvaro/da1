import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentMethodVerifyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🔍</Text>
        </View>
        <Text style={styles.title}>Verificación en proceso</Text>
        <Text style={styles.message}>
          Tu medio de pago fue registrado correctamente. El equipo de CrownBid lo verificará
          antes de que puedas participar en subastas.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>¿Cuánto demora?</Text>
          <Text style={styles.infoText}>
            La verificación suele completarse dentro de las 24-48 horas hábiles.
            Recibirás una notificación cuando esté aprobado.
          </Text>
        </View>

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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '700', color: '#002855', textAlign: 'center' },
  message: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  infoBox: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', padding: 16, width: '100%', gap: 8 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A' },
  infoText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  primaryBtn: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  secondaryBtnText: { color: '#64748B', fontSize: 14 },
});
