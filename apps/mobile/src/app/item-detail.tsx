import { AuctionCountdown } from '@/components/AuctionCountdown';
import { ThemedText } from '@/components/themed-text';
import { fetchAuctionDetail, fetchItem } from '@/services/api';
import type { AuctionScheduleFields } from '@/types/auction';
import { BID_DENIAL_MESSAGES } from '@/utils/bidErrors';
import { resolveProductImageUrl } from '@/utils/images';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ItemDetail = {
  id: number;
  auctionId: number;
  title: string;
  catalogDescription: string | null;
  basePrice: number | null;
  currentHighestBid: number | null;
  minNextBid: number | null;
  maxNextBid: number | null;
  currency: string;
  status: 'pending' | 'live' | 'sold' | 'closed';
  auctionStatus: 'scheduled' | 'live' | 'closed';
  canBid: boolean;
  canEnterLive: boolean;
  cannotBidReason: string | null;
  isOwner?: boolean;
  imageUrls?: string[];
  pieceNumber?: number | string;
  artistOrDesigner?: string | null;
  originDate?: string | null;
  history?: string | null;
  components?: string | null;
  ownerId?: number | null;
  highestBidderDisplay: { bidderNumber: number } | null;
};

const ITEM_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', live: 'En Vivo', sold: 'Vendido', closed: 'Cerrado',
};
const ITEM_STATUS_COLOR: Record<string, string> = {
  pending: '#6B7280', live: '#16A34A', sold: '#7C3AED', closed: '#6B7280',
};
const ITEM_STATUS_BG: Record<string, string> = {
  pending: '#F3F4F6', live: '#DCFCE7', sold: '#F3E8FF', closed: '#F3F4F6',
};

export default function ItemDetailScreen() {
  const router = useRouter();
  const { itemId, auctionId } = useLocalSearchParams<{ itemId: string; auctionId: string }>();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [auctionSchedule, setAuctionSchedule] = useState<AuctionScheduleFields | null>(null);
  const [displayAuctionStatus, setDisplayAuctionStatus] = useState<ItemDetail['auctionStatus']>('scheduled');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!itemId) {
      setError('Ítem inválido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await (fetchItem(Number(itemId)) as Promise<ItemDetail>);
      setItem(result);
      setDisplayAuctionStatus(result.auctionStatus);
      const auctionIdForSchedule = result.auctionId ?? Number(auctionId);
      if (auctionIdForSchedule) {
        try {
          const detail = await (fetchAuctionDetail(auctionIdForSchedule) as Promise<AuctionScheduleFields & { status: ItemDetail['auctionStatus'] }>);
          setAuctionSchedule({
            date: detail.date,
            time: detail.time,
            endTime: detail.endTime,
            status: detail.status,
          });
          setDisplayAuctionStatus(detail.status);
        } catch {
          setAuctionSchedule(null);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el artículo.');
    } finally {
      setLoading(false);
    }
  }, [itemId, auctionId]);

  useFocusEffect(
    __useCallback_wrapper(() => {
      void loadItem();
    }, [loadItem])
  );

  const effectiveAuctionId = item?.auctionId ?? Number(auctionId);
  const isItemLive = item?.status === 'live';
  const canEnterLiveNow =
    !!item?.canEnterLive && displayAuctionStatus === 'live' && isItemLive;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backButton}>
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>
        </View>
        <ActivityIndicator style={styles.loader} size="large" color="#D35400" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backButton}>
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error ?? 'Artículo no encontrado.'}</Text>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>← Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const primaryImage = resolveProductImageUrl(item.imageUrls?.[0]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['bottom']}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.imageContainer}>
            <Pressable style={styles.floatingBackButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
              <ThemedText style={styles.backIcon}>←</ThemedText>
            </Pressable>
            {primaryImage ? (
              <Image source={{ uri: primaryImage }} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <Text style={styles.bigIcon}>📦</Text>
            )}
            <View style={[styles.itemStatusBadge, { backgroundColor: ITEM_STATUS_BG[item.status] }]}>
              <Text style={[styles.itemStatusText, { color: ITEM_STATUS_COLOR[item.status] }]}>
                {ITEM_STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.title}>{item.title}</Text>
            {item.pieceNumber != null ? (
              <Text style={styles.metaLine}>Pieza Nº {item.pieceNumber}</Text>
            ) : null}
            {item.artistOrDesigner ? (
              <Text style={styles.metaLine}>Artista / diseñador: {item.artistOrDesigner}</Text>
            ) : null}
            {item.originDate ? (
              <Text style={styles.metaLine}>Fecha / origen: {item.originDate}</Text>
            ) : null}
            {item.components ? (
              <Text style={styles.metaLine}>Componentes: {item.components}</Text>
            ) : null}

            {item.history ? (
              <Text style={styles.description}>{item.history}</Text>
            ) : null}

            {item.catalogDescription ? (
              <Text style={styles.description}>{item.catalogDescription}</Text>
            ) : null}

            {/* Precios */}
            {auctionSchedule && isItemLive ? (
              <View style={styles.countdownCard}>
                <AuctionCountdown
                  date={auctionSchedule.date}
                  time={auctionSchedule.time}
                  endTime={auctionSchedule.endTime}
                  status={displayAuctionStatus}
                  variant="detail"
                  onStatusChange={setDisplayAuctionStatus}
                  onExpired={() => setDisplayAuctionStatus('closed')}
                />
              </View>
            ) : item.status === 'sold' ? (
              <View style={styles.soldBanner}>
                <Text style={styles.soldBannerTitle}>Artículo vendido</Text>
                <Text style={styles.soldBannerText}>
                  Este ítem ya fue adjudicado y no admite nuevas ofertas.
                </Text>
              </View>
            ) : null}

            <View style={styles.priceBox}>
              {item.basePrice != null && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Precio base</Text>
                  <Text style={styles.priceBase}>
                    {item.currency} {item.basePrice.toLocaleString('es-AR')}
                  </Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Mejor oferta actual</Text>
                <Text style={styles.priceCurrent}>
                  {item.currentHighestBid != null
                    ? `${item.currency} ${item.currentHighestBid.toLocaleString('es-AR')}`
                    : 'Sin ofertas aún'}
                </Text>
              </View>
              {item.minNextBid != null && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Próxima puja mínima</Text>
                  <Text style={styles.priceMin}>
                    {item.currency} {item.minNextBid.toLocaleString('es-AR')}
                  </Text>
                </View>
              )}
            </View>

            {/* Mejor postor */}
            {item.highestBidderDisplay && (
              <View style={styles.bidderRow}>
                <Text style={styles.bidderLabel}>Postor actual</Text>
                <Text style={styles.bidderValue}>
                  Postor #{item.highestBidderDisplay.bidderNumber}
                </Text>
              </View>
            )}

            {/* Mensaje si no puede pujar */}
            {!item.canBid && item.cannotBidReason && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  {BID_DENIAL_MESSAGES[item.cannotBidReason] ?? 'No podés pujar en este momento.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Botón inferior: ahora dentro del layout flexible respetando Android */}
        <View style={styles.bottomBar}>
          {canEnterLiveNow ? (
            <Pressable
              style={styles.actionButton}
              onPress={() => router.push({
                pathname: '/live-auction',
                params: {
                  auctionId: String(effectiveAuctionId),
                  itemId: String(item.id),
                  title: item.title,
                  currentBid: String(item.currentHighestBid ?? item.basePrice ?? 0),
                  minNextBid: String(item.minNextBid ?? ''),
                  currency: item.currency,
                },
              })}
            >
              <Text style={styles.actionButtonText}>Entrar a subasta en vivo</Text>
            </Pressable>
          ) : (
            <View style={[styles.actionButton, styles.actionButtonDisabled]}>
              <Text style={styles.actionButtonText}>
                {item.isOwner
                  ? 'No podés pujar sobre un artículo propio.'
                  : item.status === 'sold'
                  ? 'Artículo vendido'
                  : item.status === 'closed'
                  ? 'Artículo cerrado'
                  : displayAuctionStatus === 'closed'
                  ? 'Subasta finalizada'
                  : displayAuctionStatus === 'scheduled'
                  ? 'Subasta aún no comenzó'
                  : 'No disponible'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 20 },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 15, paddingTop: 50 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 22, color: '#002855', fontWeight: 'bold' },

  loader: { marginTop: 100 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  errorText: { color: '#E74C3C', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#D35400', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },

  imageContainer: { width: '100%', height: 280, backgroundColor: '#D0D4DC', justifyContent: 'center', alignItems: 'center' },
  itemImage: { width: '100%', height: '100%' },
  bigIcon: { fontSize: 80, opacity: 0.7 },
  floatingBackButton: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  itemStatusBadge: { position: 'absolute', bottom: 14, right: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  itemStatusText: { fontSize: 12, fontWeight: '700' },

  contentContainer: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#002855', marginBottom: 8 },
  description: { fontSize: 15, color: '#4A5568', lineHeight: 22, marginBottom: 20 },
  metaLine: { fontSize: 13, color: '#6B7280', marginBottom: 4 },

  countdownCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 14,
    marginBottom: 16,
  },
  soldBanner: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  soldBannerTitle: { fontSize: 16, fontWeight: '700', color: '#6B21A8' },
  soldBannerText: { fontSize: 13, color: '#7C3AED' },

  priceBox: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 18, marginBottom: 20, gap: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: '#666' },
  priceBase: { fontSize: 16, fontWeight: '600', color: '#002855' },
  priceCurrent: { fontSize: 20, fontWeight: 'bold', color: '#D35400' },
  priceMin: { fontSize: 16, fontWeight: '600', color: '#16A34A' },

  bidderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  bidderLabel: { fontSize: 14, color: '#666' },
  bidderValue: { fontSize: 14, fontWeight: '600', color: '#002855' },

  warningBox: { backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#FDE047', borderRadius: 10, padding: 14, marginTop: 16 },
  warningText: { color: '#854D0E', fontSize: 14 },

  bottomBar: { 
    width: '100%', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 20, 
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderTopColor: '#EEEEEE' 
  },
  actionButton: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  actionButtonDisabled: { backgroundColor: '#9CA3AF' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

// Helper interno para mantener la compatibilidad del FocusEffect de navegación nativa
function __useCallback_wrapper(fn: () => void, deps: any[]) {
  return useCallback(fn, deps);
}