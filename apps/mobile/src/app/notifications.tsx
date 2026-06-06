import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function NotificationsScreen() {
  const router = useRouter();

  // Datos simulados de las notificaciones del Figma
  const notifications = [
    { id: '1', title: '¡Felicitaciones! Ganaste la subasta', desc: 'Eres el ganador de "Rolex Submariner Vintage"', time: 'hace 5 minutos', icon: '🏆', color: '#FFF9E6', border: '#FDE68A', iconColor: '#B45309' },
    { id: '2', title: 'Eres el mejor postor actualmente', desc: 'Tu puja de $1.250 está ganando en "Obra de Arte Moderna"', time: 'hace 15 minutos', icon: '📈', color: '#F0FDF4', border: '#BBF7D0', iconColor: '#15803D' },
    { id: '3', title: 'Te han superado', desc: 'Otro usuario hizo una puja mayor en "Collar de Diamantes"', time: 'hace 1 hora', icon: '📉', color: '#FFF7ED', border: '#FFEDD5', iconColor: '#C2410C' },
    { id: '4', title: 'Pago fallido', desc: 'No pudimos cobrar tu método de pago para "Jarrón Antiguo"', time: 'hace 2 horas', icon: '❌', color: '#FEF2F2', border: '#FECACA', iconColor: '#B91C1C' },
    { id: '5', title: 'Subasta comenzando pronto', desc: 'La subasta de Relojes de Lujo comienza en 1 hora', time: 'hace 3 horas', icon: '🕒', color: '#EFF6FF', border: '#DBEAFE', iconColor: '#1D4ED8' },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Barra Superior */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </Pressable>
        <ThemedText style={styles.topBarTitle}>Notificaciones</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.headerSubtitle}>Mantente al día con tus subastas</ThemedText>

        {notifications.map((notif) => (
          <View key={notif.id} style={[styles.notifCard, { backgroundColor: notif.color, borderColor: notif.border }]}>
            <View style={styles.notifHeader}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFF' }]}>
                <ThemedText style={[styles.notifIcon, { color: notif.iconColor }]}>{notif.icon}</ThemedText>
              </View>
              <View style={styles.textContainer}>
                <ThemedText style={styles.notifTitle}>{notif.title}</ThemedText>
                <ThemedText style={styles.notifDesc}>{notif.desc}</ThemedText>
                <ThemedText style={styles.notifTime}>{notif.time}</ThemedText>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 5 },
  backIcon: { fontSize: 24, color: '#002855' },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: '#002855' },
  scrollContent: { padding: 20 },
  headerSubtitle: { fontSize: 16, color: '#666', marginBottom: 25 },
  notifCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 15 },
  notifHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  notifIcon: { fontSize: 22 },
  textContainer: { flex: 1 },
  notifTitle: { fontSize: 17, fontWeight: 'bold', color: '#002855', marginBottom: 5 },
  notifDesc: { fontSize: 14, color: '#444', lineHeight: 20 },
  notifTime: { fontSize: 12, color: '#888', marginTop: 10 },
});