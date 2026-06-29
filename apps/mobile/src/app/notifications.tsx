import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchNotifications,
  getAuthToken,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/api';
import type { Notification } from '@/services/types';
import {
  formatRelativeTime,
  getNotificationVisual,
  resolveNotificationNavigation,
} from '@/services/notification-mapper';

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getAuthToken()) {
      setError('Debes iniciar sesión para ver tus notificaciones.');
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetchNotifications();
      setItems(res.items);
    } catch {
      setError('No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  async function onPressNotification(notification: Notification) {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
        setItems((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch {
      }
    }

    const nav = resolveNotificationNavigation(notification);
    switch (nav.type) {
      case 'live-auction':
        router.push(`/live-auction?auctionId=${nav.auctionId}&itemId=${nav.itemId}`);
        break;
      case 'catalog':
        router.push(`/catalog?id=${nav.auctionId}`);
        break;
      case 'payment-methods':
        router.push('/payment-methods');
        break;
      case 'purchases':
        router.push('/my-purchases' as never);
        break;
      case 'submissions':
        router.push('/mis-articulos');
        break;
      case 'none':
        if (nav.message) Alert.alert('Información', nav.message);
        break;
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      Alert.alert('Error', 'No se pudieron marcar todas como leídas.');
    }
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Notificaciones</Text>
          {unreadCount > 0 ? (
            <Pressable onPress={() => void onMarkAllRead()} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Leer todo</Text>
            </Pressable>
          ) : (
            <View style={{ width: 72 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        >
          <Text style={styles.subtitle}>Tus últimas actividades</Text>

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#E67E22" />
            </View>
          )}

          {!loading && error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              {!getAuthToken() && (
                <Pressable style={styles.loginBtn} onPress={() => router.replace('/login')}>
                  <Text style={styles.loginBtnText}>Iniciar sesión</Text>
                </Pressable>
              )}
            </View>
          )}

          {!loading && !error && items.length === 0 && (
            <Text style={styles.emptyText}>No tenés notificaciones por ahora.</Text>
          )}

          {!loading &&
            !error &&
            items.map((n) => {
              const visual = getNotificationVisual(n.type);
              return (
                <Pressable
                  key={n.id}
                  onPress={() => void onPressNotification(n)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: visual.backgroundColor,
                      borderColor: visual.borderColor,
                      opacity: n.read ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>{visual.icon}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{n.title}</Text>
                    <Text style={styles.cardDesc}>{n.message}</Text>
                    <Text style={styles.cardTime}>{formatRelativeTime(n.createdAt)}</Text>
                  </View>
                  {!n.read && <View style={styles.unreadDot} />}
                </Pressable>
              );
            })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#002855' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#002855',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  topBarTitle: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 17, fontWeight: '700' },
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  markAllText: { color: '#FDE68A', fontSize: 13, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 35 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 12,
  },
  errorText: { color: '#991B1B', fontSize: 14, lineHeight: 20 },
  loginBtn: {
    backgroundColor: '#002855',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  loginBtnText: { color: '#FFF', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 15, paddingVertical: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 6 },
  cardTime: { fontSize: 12, color: '#9CA3AF' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E67E22',
    marginTop: 4,
  },
});
