import { AuctionCountdown } from '@/components/AuctionCountdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAuctionDetail, fetchAuctionItems } from '@/services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type AuctionDetail = {
  id: number;
  date: string | null;
  time: string | null;
  endTime: string | null;
  status: 'scheduled' | 'live' | 'closed';
  category: string | null;
  currency: string;
  location: string | null;
  capacity: number | null;
  itemCount: number | null;
  canAccess: boolean;
  canBid: boolean;
  auctioneer: { fullName: string | null; licenseNumber: string | null } | null;
};

type AuctionItem = {
  id: number;
  title: string;
  catalogDescription: string | null;
  basePrice: number | null;
  currentHighestBid: number | null;
  currency: string;
  status: 'pending' | 'live' | 'sold' | 'closed';
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  live: 'En Vivo',
  closed: 'Cerrada',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#0369A1',
  live: '#16A34A',
  closed: '#6B7280',
};

const STATUS_BG: Record<string, string> = {
  scheduled: '#E0F2FE',
  live: '#DCFCE7',
  closed: '#F3F4F6',
};

const ITEM_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  live: 'En Vivo',
  sold: 'Vendido',
  closed: 'Cerrado',
};

const CATEGORY_LABELS: Record<string, string> = {
  comun: 'Común', especial: 'Especial', plata: 'Plata', oro: 'Oro', platino: 'Platino',
};

const imagenesProductos: Record<number, any> = {
  // Relojes del catálogo 1
  1: require('../../assets/images/productos/rolex-submariner/rolex-submariner1.jpg'),
  2: require('../../assets/images/productos/omega-speedmaster/omega-speedmaster1.jpg'),

  // Catálogos base (del 2 al 16)
  3: require('../../assets/images/productos/arte-moderno/arte-moderno1.jpg'),
  4: require('../../assets/images/productos/pintura-clasica/pintura-clasica1.jpg'),
  5: require('../../assets/images/productos/joyeria-fina/joyeria-fina1.jpg'),
  6: require('../../assets/images/productos/autoc-clasico/auto-clasico1.jpg'),
  7: require('../../assets/images/productos/antiguedad/antiguedad1.jpg'),
  8: require('../../assets/images/productos/mueble-vintage/mueble-vintage1.jpg'),
  9: require('../../assets/images/productos/ropa-diseñador/ropa-diseñador1.jpg'),
  10: require('../../assets/images/productos/fotografia-autor/fotografia-autor1.jpg'),
  11: require('../../assets/images/productos/instrumentos-musicales/instrumento-musical1.jpg'),
  12: require('../../assets/images/productos/coleccionables/coleccionable1.jpg'),
  13: require('../../assets/images/productos/arte-contemporaneo/arte-contemporaneo1.jpg'),
  14: require('../../assets/images/productos/fotos-historicas/foto-historica1.jpg'),
  15: require('../../assets/images/productos/muebles-clasicos/muebles-clasicos1.jpg'),
  16: require('../../assets/images/productos/diseño-industrial/diseño-industrial1.jpg'),
  17: require('../../assets/images/productos/reloj-vintage/reloj-vintage1.jpg'),

  // --- ARTÍCULOS DE TU CATÁLOGO DE PRUEBA (#21) ---
  21: require('../../assets/images/productos/arte-moderno/arte-moderno1.jpg'),
  22: require('../../assets/images/productos/joyeria-fina/joyeria-fina1.jpg'),
  23: require('../../assets/images/productos/instrumentos-musicales/instrumento-musical1.jpg'),
};

const imagenDefault = require('../../assets/images/icon.png');

export default function CatalogScreen() {
  const router = useRouter();
  const { catalogId } = useLocalSearchParams<{ catalogId: string }>();
  const auctionId = Number(catalogId);

  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [displayStatus, setDisplayStatus] = useState<AuctionDetail['status']>('scheduled');
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auctionId) {
      setError('Subasta inválida.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [detail, itemsResult] = await Promise.all([
        fetchAuctionDetail(auctionId) as Promise<AuctionDetail>,
        fetchAuctionItems(auctionId) as Promise<{ items: AuctionItem[] }>,
      ]);
      setAuction(detail);
      setDisplayStatus(detail.status);
      setItems(itemsResult?.items ?? []);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la subasta.');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backButton}>
            <ThemedText style={styles.topBarIcon}>←</ThemedText>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <ThemedText style={styles.topBarTitle}>CrownBid</ThemedText>
          </View>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#D35400" />
        ) : error ? (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Volver</Text>
            </Pressable>
          </View>
        ) : auction ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                Subasta #{auction.id}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[displayStatus] }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[displayStatus] }]}>
                  {STATUS_LABEL[displayStatus] ?? displayStatus}
                </Text>
              </View>
            </View>

            <View style={styles.countdownCard}>
              <AuctionCountdown
                date={auction.date}
                time={auction.time}
                endTime={auction.endTime}
                status={displayStatus}
                variant="detail"
                onStatusChange={setDisplayStatus}
                onExpired={() => setDisplayStatus('closed')}
              />
            </View>

            {/* Info grid */}
            <View style={styles.infoGrid}>
              {auction.date && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Fecha</Text>
                  <Text style={styles.infoValue}>{auction.date}</Text>
                </View>
              )}
              {auction.time && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Inicio</Text>
                  <Text style={styles.infoValue}>{auction.time.slice(0, 5)}</Text>
                </View>
              )}
              {auction.endTime && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Cierre</Text>
                  <Text style={styles.infoValue}>{auction.endTime.slice(0, 5)}</Text>
                </View>
              )}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Categoría</Text>
                <Text style={styles.infoValue}>
                  {CATEGORY_LABELS[auction.category ?? ''] ?? auction.category ?? '—'}
                </Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Moneda</Text>
                <Text style={styles.infoValue}>{auction.currency}</Text>
              </View>
              {auction.location && (
                <View style={[styles.infoCard, styles.infoCardFull]}>
                  <Text style={styles.infoLabel}>Ubicación</Text>
                  <Text style={styles.infoValue}>{auction.location}</Text>
                </View>
              )}
              {auction.auctioneer?.fullName && (
                <View style={[styles.infoCard, styles.infoCardFull]}>
                  <Text style={styles.infoLabel}>Subastador</Text>
                  <Text style={styles.infoValue}>{auction.auctioneer.fullName}</Text>
                </View>
              )}
            </View>

            {/* Items */}
            <Text style={styles.sectionTitle}>
              Artículos en Subasta ({items.length})
            </Text>

            {items.length === 0 ? (
              <View style={styles.emptyItems}>
                <Text style={styles.emptyItemsText}>Esta subasta aún no tiene artículos asignados.</Text>
              </View>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => router.push({
                    pathname: '/item-detail',
                    params: { auctionId: String(auction.id), itemId: String(item.id) },
                  })}
                >
                  <View style={styles.itemIconBox}>
  <Image 
  source={imagenesProductos[item.id] || imagenDefault} 
  style={{ width: '100%', height: '100%', borderRadius: 10 }} 
  resizeMode="cover"
/>
</View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    {item.catalogDescription && (
                      <Text style={styles.itemDesc} numberOfLines={2}>{item.catalogDescription}</Text>
                    )}
                    <View style={styles.itemMeta}>
                      {item.currentHighestBid != null ? (
                        <Text style={styles.itemBid}>
                          Mejor oferta: {item.currency} {item.currentHighestBid.toLocaleString('es-AR')}
                        </Text>
                      ) : item.basePrice != null ? (
                        <Text style={styles.itemBid}>
                          Base: {item.currency} {item.basePrice.toLocaleString('es-AR')}
                        </Text>
                      ) : null}
                      <View style={[styles.itemStatusBadge,
                        item.status === 'sold' && { backgroundColor: '#F3E8FF' },
                        item.status === 'live' && { backgroundColor: '#DCFCE7' },
                      ]}>
                        <Text style={[styles.itemStatusText,
                          item.status === 'sold' && { color: '#7C3AED' },
                          item.status === 'live' && { color: '#16A34A' },
                        ]}>
                          {ITEM_STATUS_LABEL[item.status] ?? item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.arrowIcon}>→</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        ) : null}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 14, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 5, width: 40 },
  topBarTitle: { fontWeight: 'bold', fontSize: 16, color: '#002855' },
  topBarIcon: { fontSize: 22, color: '#002855' },
  placeholder: { width: 40 },

  loader: { marginTop: 60 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: '#E74C3C', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: '#D35400', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },

  scrollContent: { padding: 20, paddingBottom: 35 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#002855', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },

  countdownCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 14,
    marginBottom: 16,
  },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  infoCard: { width: '47%', backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E6E9EB', padding: 14 },
  infoCardFull: { width: '100%' },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#002855' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#002855', marginBottom: 14 },
  emptyItems: { padding: 30, alignItems: 'center' },
  emptyItemsText: { color: '#888', fontSize: 14, textAlign: 'center' },

  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E9EB', borderRadius: 12, padding: 14, marginBottom: 12, alignItems: 'center' },
  itemIconBox: { width: 52, height: 52, backgroundColor: '#F0F4F8', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemIcon: { fontSize: 22 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#002855', marginBottom: 3 },
  itemDesc: { fontSize: 12, color: '#666', marginBottom: 6 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemBid: { fontSize: 13, color: '#D35400', fontWeight: '600' },
  itemStatusBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itemStatusText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  arrowIcon: { fontSize: 18, color: '#CCC', marginLeft: 8 },
});