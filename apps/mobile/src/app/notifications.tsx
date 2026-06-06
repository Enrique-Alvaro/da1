import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const NOTIFICATIONS = [
  { id: '1', title: '¡Ganaste la subasta!', desc: 'Eres el ganador. El equipo se pondrá en contacto para coordinar el pago y envío.', time: 'hace 5 min', icon: '🏆', bg: '#FFFBEB', border: '#FDE68A' },
  { id: '2', title: 'Sos el mejor postor', desc: 'Tu oferta está ganando. Seguí participando para mantener la delantera.', time: 'hace 15 min', icon: '📈', bg: '#F0FDF4', border: '#A7F3D0' },
  { id: '3', title: 'Te superaron', desc: 'Otro usuario hizo una oferta mayor. ¡Podés volver a pujar!', time: 'hace 1h', icon: '📉', bg: '#FFF7ED', border: '#FED7AA' },
  { id: '4', title: 'Subasta por comenzar', desc: 'Una subasta de tu categoría comienza en 1 hora. Revisá tu medio de pago.', time: 'hace 2h', icon: '🕐', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: '5', title: 'Artículo aceptado', desc: 'Uno de tus artículos fue aprobado y será incluido en una próxima subasta.', time: 'hace 3h', icon: '✓', bg: '#F0FDF4', border: '#A7F3D0' },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Notificaciones</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Tus últimas actividades</Text>
        {NOTIFICATIONS.map(n => (
          <View key={n.id} style={[styles.card, { backgroundColor: n.bg, borderColor: n.border }]}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{n.icon}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{n.title}</Text>
              <Text style={styles.cardDesc}>{n.desc}</Text>
              <Text style={styles.cardTime}>{n.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, backgroundColor: '#002855' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  topBarTitle: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  iconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 6 },
  cardTime: { fontSize: 12, color: '#9CA3AF' },
});
