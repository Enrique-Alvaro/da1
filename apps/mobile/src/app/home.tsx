import { CustomNavBar } from '@/components/CustomNavBar';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAuctions, getAuthToken, getCurrentUser, logout } from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, Text } from 'react-native';

type Auction = {
  id: number;
  date: string | null;
  time: string | null;
  status: string;
  category: string;
  currency: string;
  location: string;
  itemCount: number | null;
  currentHighestBid: number | null;
  canAccess: boolean;
  cannotAccessReason: string | null;
};

const ACCESS_DENIAL_MESSAGES: Record<string, string> = {
  USER_NOT_ADMITTED:          'Tu cuenta aún no fue aprobada por el equipo.',
  CATEGORY_NOT_ALLOWED:       'Tu categoría no alcanza para esta subasta.',
  PAYMENT_METHOD_REQUIRED:    'Necesitás registrar un medio de pago.',
  PAYMENT_METHOD_NOT_VERIFIED:'Tu medio de pago aún no fue verificado.',
  CLIENT_NOT_FOUND:           'No se encontró tu perfil de cliente.',
};

type ApiUser = {
  fullName: string;
  category: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  comun: 'Común',
  especial: 'Especial',
  plata: 'Plata',
  oro: 'Oro',
  platino: 'Platino',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  live: 'En Vivo',
  closed: 'Cerrada',
};

export default function HomeScreen() {
  const router = useRouter();
  const isGuest = !getAuthToken();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [userLoading, setUserLoading] = useState(!isGuest);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      if (!isGuest) {
        try {
          const userResult = await (getCurrentUser() as Promise<any>);
          setUser(userResult);
        } catch {
          // continúa sin nombre si el fetch del usuario falla
        } finally {
          setUserLoading(false);
        }
      }

      try {
        const auctionsResult = await (fetchAuctions() as Promise<{ items: Auction[] }>);
        setAuctions(auctionsResult?.items ?? []);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar las subastas.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const renderAuctionCard = ({ item }: { item: Auction }) => {
    const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;
    const statusLabel = STATUS_LABELS[item.status] ?? item.status;
    const isLive = item.status === 'live';
    const locked = isGuest || !item.canAccess;

    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          if (isGuest) {
            router.push('/login');
          } else if (item.canAccess) {
            router.push({ pathname: '/catalog', params: { catalogId: String(item.id) } });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, isLive ? styles.badgeLive : styles.badgeDefault]}>
            <ThemedText style={[styles.badgeText, isLive ? styles.badgeTextLive : styles.badgeTextDefault]}>
              {statusLabel}
            </ThemedText>
          </View>
          <View style={styles.badgeCategory}>
            <ThemedText style={styles.badgeCategoryText}>{categoryLabel}</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.location}>{item.location}</ThemedText>

        <View style={styles.metaRow}>
          <ThemedText style={styles.meta}>
            {item.date ?? '—'}{item.time ? `  ${item.time}` : ''}
          </ThemedText>
          <ThemedText style={styles.meta}>{item.currency}</ThemedText>
        </View>

        {item.itemCount != null && (
          <ThemedText style={styles.meta}>{item.itemCount} ítems</ThemedText>
        )}

        {item.currentHighestBid != null && (
          <ThemedText style={styles.bid}>
            Mejor oferta: {item.currency} {item.currentHighestBid.toLocaleString()}
          </ThemedText>
        )}

        {locked && (
          <ThemedText style={styles.locked}>
            {isGuest
              ? 'Iniciá sesión para participar'
              : (ACCESS_DENIAL_MESSAGES[item.cannotAccessReason ?? ''] ?? 'No podés participar en esta subasta.')}
          </ThemedText>
        )}
      </Pressable>
    );
  };

  async function onLogout() {
    try {
      if (getAuthToken()) {
        await logout();
      }
    } catch {
      // clear local session even if API fails
    } finally {
      router.replace('/login');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topBar}>
        {!isGuest && <NotificationBell color="#FFFFFF" />}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText style={styles.topBarTitle}>CrownBid</ThemedText>
        </View>
        <Pressable style={styles.iconButton} onPress={() => void (isGuest ? router.replace('/login') : onLogout())}>
          <ThemedText style={styles.topBarIcon}>{isGuest ? 'Entrar' : 'Salir'}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.userBanner}>
        {isGuest ? (
          <>
            <View style={styles.guestBannerHeader}>
              <View>
                <Text style={styles.greeting}>Bienvenido</Text>
                <Text style={styles.userRank}>Subastas Premium</Text>
              </View>
              <Pressable style={styles.entrarButton} onPress={() => router.replace('/login')}>
                <ThemedText style={styles.entrarButtonText}>Entrar</ThemedText>
              </Pressable>
            </View>
            <View style={styles.guestAlertBox}>
              <Text style={styles.guestAlertText}>
                Navegando como invitado. Iniciá sesión para ver precios y pujar.
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.greeting}>
              Hola, {userLoading ? '...' : (user?.fullName ?? '')}
            </Text>
            <Text style={styles.userRank}>
              Categoría: {userLoading ? '...' : (CATEGORY_LABELS[user?.category ?? ''] ?? user?.category ?? '—')}
            </Text>
          </>
        )}
      </View>

      <CustomNavBar />

      <ThemedText style={styles.sectionTitle}>Subastas</ThemedText>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#D35400" />
      ) : error ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>{error}</ThemedText>
        </View>
      ) : auctions.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>No hay subastas disponibles.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={auctions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          renderItem={renderAuctionCard}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  topBarTitle: { fontWeight: 'bold', fontSize: 16, color: '#002855' },
  iconButton: { padding: 5 },
  topBarIcon: { fontSize: 14, color: '#666' },

  userBanner: { backgroundColor: '#D35400', padding: 20, paddingBottom: 30 },
  greeting: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  userRank: { color: '#FFF', fontSize: 15, marginTop: 4, opacity: 0.9 },

  guestBannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entrarButton: { backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  entrarButtonText: { color: '#D35400', fontWeight: 'bold', fontSize: 14 },
  guestAlertBox: { backgroundColor: '#A04000', padding: 12, borderRadius: 8, marginTop: 15 },
  guestAlertText: { color: '#FFF', fontSize: 14 },

  sectionTitle: { fontSize: 18, color: '#002855', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 8, fontWeight: 'bold' },
  listContainer: { padding: 15, paddingBottom: 30 },
  loader: { marginTop: 40 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E9EB',
    padding: 15,
    marginBottom: 15,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', gap: 8 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeDefault: { backgroundColor: '#E6E9EB' },
  badgeLive: { backgroundColor: '#FFF3CD' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextDefault: { color: '#444' },
  badgeTextLive: { color: '#856404' },

  badgeCategory: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#EAF3FF' },
  badgeCategoryText: { fontSize: 12, fontWeight: '600', color: '#0369A1' },

  location: { fontSize: 16, color: '#002855', fontWeight: '600' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 13, color: '#666' },
  bid: { fontSize: 14, color: '#D35400', fontWeight: '600' },
  locked: { fontSize: 12, color: '#E74C3C', fontWeight: '500' },
});
