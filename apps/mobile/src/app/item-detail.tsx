import { AuctionCountdown } from '@/components/AuctionCountdown';
import { ThemedText } from '@/components/themed-text';
import { fetchAuctionDetail, fetchItem } from '@/services/api';
import type { AuctionScheduleFields } from '@/types/auction';
import { BID_DENIAL_MESSAGES } from '@/utils/bidErrors';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// --- DICCIONARIO COMPLETO DE CARRUSELES (6 IMÁGENES .JPG POR PRODUCTO) ---
const carruselProductos: Record<number, any[]> = {
  1: [
    require('../../assets/images/productos/reloj-cassio/reloj-cassio1.jpg'),
    require('../../assets/images/productos/reloj-cassio/reloj-cassio2.jpg'),
    require('../../assets/images/productos/reloj-cassio/reloj-cassio3.jpg'),
    require('../../assets/images/productos/reloj-cassio/reloj-cassio4.jpg'),
    require('../../assets/images/productos/reloj-cassio/reloj-cassio5.jpg'),
    require('../../assets/images/productos/reloj-cassio/reloj-cassio6.jpg'),
  ],
  2: [
    require('../../assets/images/productos/rolex-submariner/rolex-submariner1.jpg'),
    require('../../assets/images/productos/rolex-submariner/rolex-submariner2.jpg'),
    require('../../assets/images/productos/rolex-submariner/rolex-submariner3.jpg'),
    require('../../assets/images/productos/rolex-submariner/rolex-submariner4.jpg'),
    require('../../assets/images/productos/rolex-submariner/rolex-submariner5.jpg'),
    require('../../assets/images/productos/rolex-submariner/rolex-submariner6.jpg'),
  ],
  3: [
    require('../../assets/images/productos/omega-speedmaster/omega-speedmaster1.jpg'),
    require('../../assets/images/productos/omega-speedmaster/omega-speedmaster2.jpg'),
    require('../../assets/images/productos/omega-speedmaster/omega-speedmaster3.jpg'),
    require('../../assets/images/productos/omega-speedmaster/omega-speedmaster4.jpg'),
    require('../../assets/images/productos/omega-speedmaster/omega-speedmaster5.jpg'),
    require('../../assets/images/productos/omega-speedmaster/omega-speedmaster6.jpg'),
  ],
  // Catálogos base mapeados según tu item_id_front de la base de datos
  4: [
    require('../../assets/images/productos/pintura-clasica/pintura-clasica1.jpg'),
    require('../../assets/images/productos/pintura-clasica/pintura-clasica2.jpg'),
    require('../../assets/images/productos/pintura-clasica/pintura-clasica3.jpg'),
    require('../../assets/images/productos/pintura-clasica/pintura-clasica4.jpg'),
    require('../../assets/images/productos/pintura-clasica/pintura-clasica5.jpg'),
    require('../../assets/images/productos/pintura-clasica/pintura-clasica6.jpg'),
  ],
  5: [
    require('../../assets/images/productos/joyeria-fina/joyeria-fina1.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina2.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina3.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina4.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina5.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina6.jpg'),
  ],
  6: [
    require('../../assets/images/productos/autoc-clasico/auto-clasico1.jpg'),
    require('../../assets/images/productos/autoc-clasico/auto-clasico2.jpg'),
    require('../../assets/images/productos/autoc-clasico/auto-clasico3.jpg'),
    require('../../assets/images/productos/autoc-clasico/auto-clasico4.jpg'),
    require('../../assets/images/productos/autoc-clasico/auto-clasico5.jpg'),
    require('../../assets/images/productos/autoc-clasico/auto-clasico6.jpg'),
  ],
  7: [
    require('../../assets/images/productos/antiguedad/antiguedad1.jpg'),
    require('../../assets/images/productos/antiguedad/antiguedad2.jpg'),
    require('../../assets/images/productos/antiguedad/antiguedad3.jpg'),
    require('../../assets/images/productos/antiguedad/antiguedad4.jpg'),
    require('../../assets/images/productos/antiguedad/antiguedad5.jpg'),
    require('../../assets/images/productos/antiguedad/antiguedad6.jpg'),
  ],
  8: [
    require('../../assets/images/productos/mueble-vintage/mueble-vintage1.jpg'),
    require('../../assets/images/productos/mueble-vintage/mueble-vintage2.jpg'),
    require('../../assets/images/productos/mueble-vintage/mueble-vintage3.jpg'),
    require('../../assets/images/productos/mueble-vintage/mueble-vintage4.jpg'),
    require('../../assets/images/productos/mueble-vintage/mueble-vintage5.jpg'),
    require('../../assets/images/productos/mueble-vintage/mueble-vintage6.jpg'),
  ],
  9: [
    require('../../assets/images/productos/ropa-diseñador/ropa-diseñador1.jpg'),
    require('../../assets/images/productos/ropa-diseñador/ropa-diseñador2.jpg'),
    require('../../assets/images/productos/ropa-diseñador/ropa-diseñador3.jpg'),
    require('../../assets/images/productos/ropa-diseñador/ropa-diseñador4.jpg'),
    require('../../assets/images/productos/ropa-diseñador/ropa-diseñador5.jpg'),
    require('../../assets/images/productos/ropa-diseñador/ropa-diseñador6.jpg'),
  ],
  10: [
    require('../../assets/images/productos/fotografia-autor/fotografia-autor1.jpg'),
    require('../../assets/images/productos/fotografia-autor/fotografia-autor2.jpg'),
    require('../../assets/images/productos/fotografia-autor/fotografia-autor3.jpg'),
    require('../../assets/images/productos/fotografia-autor/fotografia-autor4.jpg'),
    require('../../assets/images/productos/fotografia-autor/fotografia-autor5.jpg'),
    require('../../assets/images/productos/fotografia-autor/fotografia-autor6.jpg'),
  ],
  11: [
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical1.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical2.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical3.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical4.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical5.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical6.jpg'),
  ],
  12: [
    require('../../assets/images/productos/coleccionables/coleccionable1.jpg'),
    require('../../assets/images/productos/coleccionables/coleccionable2.jpg'),
    require('../../assets/images/productos/coleccionables/coleccionable3.jpg'),
    require('../../assets/images/productos/coleccionables/coleccionable4.jpg'),
    require('../../assets/images/productos/coleccionables/coleccionable5.jpg'),
    require('../../assets/images/productos/coleccionables/coleccionable6.jpg'),
  ],
  13: [
    require('../../assets/images/productos/arte-contemporaneo/arte-contemporaneo1.jpg'),
    require('../../assets/images/productos/arte-contemporaneo/arte-contemporaneo2.jpg'),
    require('../../assets/images/productos/arte-contemporaneo/arte-contemporaneo3.jpg'),
    require('../../assets/images/productos/arte-contemporaneo/arte-contemporaneo4.jpg'),
    require('../../assets/images/productos/arte-contemporaneo/arte-contemporaneo5.jpg'),
    require('../../assets/images/productos/arte-contemporaneo/arte-contemporaneo6.jpg'),
  ],
  14: [
    require('../../assets/images/productos/fotos-historicas/foto-historica1.jpg'),
    require('../../assets/images/productos/fotos-historicas/foto-historica2.jpg'),
    require('../../assets/images/productos/fotos-historicas/foto-historica3.jpg'),
    require('../../assets/images/productos/fotos-historicas/foto-historica4.jpg'),
    require('../../assets/images/productos/fotos-historicas/foto-historica5.jpg'),
    require('../../assets/images/productos/fotos-historicas/foto-historica6.jpg'),
  ],
  15: [
    require('../../assets/images/productos/muebles-clasicos/muebles-clasicos1.jpg'),
    require('../../assets/images/productos/muebles-clasicos/muebles-clasicos2.jpg'),
    require('../../assets/images/productos/muebles-clasicos/muebles-clasicos3.jpg'),
    require('../../assets/images/productos/muebles-clasicos/muebles-clasicos4.jpg'),
    require('../../assets/images/productos/muebles-clasicos/muebles-clasicos5.jpg'),
    require('../../assets/images/productos/muebles-clasicos/muebles-clasicos6.jpg'),
  ],
  16: [
    require('../../assets/images/productos/diseño-industrial/diseño-industrial1.jpg'),
    require('../../assets/images/productos/diseño-industrial/diseño-industrial2.jpg'),
    require('../../assets/images/productos/diseño-industrial/diseño-industrial3.jpg'),
    require('../../assets/images/productos/diseño-industrial/diseño-industrial4.jpg'),
    require('../../assets/images/productos/diseño-industrial/diseño-industrial5.jpg'),
    require('../../assets/images/productos/diseño-industrial/diseño-industrial6.jpg'),
  ],
  17: [
    require('../../assets/images/productos/reloj-vintage/reloj-vintage1.jpg'),
    require('../../assets/images/productos/reloj-vintage/reloj-vintage2.jpg'),
    require('../../assets/images/productos/reloj-vintage/reloj-vintage3.jpg'),
    require('../../assets/images/productos/reloj-vintage/reloj-vintage4.jpg'),
    require('../../assets/images/productos/reloj-vintage/reloj-vintage5.jpg'),
    require('../../assets/images/productos/reloj-vintage/reloj-vintage6.jpg'),
  ],

  21: [
    require('../../assets/images/productos/arte-moderno/arte-moderno1.jpg'),
    require('../../assets/images/productos/arte-moderno/arte-moderno2.jpg'),
    require('../../assets/images/productos/arte-moderno/arte-moderno3.jpg'),
    require('../../assets/images/productos/arte-moderno/arte-moderno4.jpg'),
    require('../../assets/images/productos/arte-moderno/arte-moderno5.jpg'),
    require('../../assets/images/productos/arte-moderno/arte-moderno6.jpg'),
  ],
  22: [
    require('../../assets/images/productos/joyeria-fina/joyeria-fina1.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina2.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina3.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina4.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina5.jpg'),
    require('../../assets/images/productos/joyeria-fina/joyeria-fina6.jpg'),
  ],
  23: [
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical1.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical2.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical3.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical4.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical5.jpg'),
    require('../../assets/images/productos/instrumentos-musicales/instrumento-musical6.jpg'),
  ],
};

const imagenDefault = require('../../assets/images/icon.png');

export default function ItemDetailScreen() {
  const router = useRouter();
  const { itemId, auctionId } = useLocalSearchParams<{ itemId: string; auctionId: string }>();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [auctionSchedule, setAuctionSchedule] = useState<AuctionScheduleFields | null>(null);
  const [displayAuctionStatus, setDisplayAuctionStatus] = useState<ItemDetail['auctionStatus']>('scheduled');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
  const canEnterLiveNow = !!item?.canEnterLive && displayAuctionStatus === 'live' && isItemLive;

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

  // Obtener el array de las 6 imágenes dinámicas o usar el default
  const lasImagenes = carruselProductos[item.id] || [imagenDefault];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['bottom']}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* CONTENEDOR DEL CARRUSEL DE IMÁGENES */}
          <View style={styles.imageContainer}>
            <Pressable style={styles.floatingBackButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
              <ThemedText style={styles.backIcon}>←</ThemedText>
            </Pressable>
            
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const offset = e.nativeEvent.contentOffset.x;
                const index = Math.round(offset / SCREEN_WIDTH);
                setActiveImageIndex(index);
              }}
              scrollEventThrottle={16}
              style={styles.carouselScrollView}
            >
              {lasImagenes.map((imgSrc, idx) => (
                <View key={idx} style={{ width: SCREEN_WIDTH, height: 280 }}>
                  <Image source={imgSrc} style={styles.itemImage} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>

            {/* Círculos indicadores del paginado abajo en el centro */}
            {lasImagenes.length > 1 && (
              <View style={styles.paginationDotsContainer}>
                {lasImagenes.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      activeImageIndex === idx ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                ))}
              </View>
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

        {/* Botón inferior */}
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

  // ESTILOS AJUSTADOS PARA EL CARRUSEL
  imageContainer: { width: '100%', height: 280, backgroundColor: '#D0D4DC', position: 'relative' },
  carouselScrollView: { width: '100%', height: '100%' },
  itemImage: { width: '100%', height: '100%' },
  floatingBackButton: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  itemStatusBadge: { position: 'absolute', bottom: 14, right: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, zIndex: 10 },
  itemStatusText: { fontSize: 12, fontWeight: '700' },
  
  // INDICADORES DE PÁGINA (PUNTITOS)
  paginationDotsContainer: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  activeDot: { backgroundColor: '#D35400', width: 10, height: 10 },
  inactiveDot: { backgroundColor: 'rgba(255,255,255,0.6)' },

  contentContainer: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#002855', marginBottom: 8 },
  description: { fontSize: 15, color: '#4A5568', lineHeight: 22, marginBottom: 20 },
  metaLine: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  countdownCard: { backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', padding: 14, marginBottom: 16 },
  soldBanner: { backgroundColor: '#F3E8FF', borderRadius: 12, borderWidth: 1, borderColor: '#E9D5FF', padding: 14, marginBottom: 16, gap: 4 },
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
  bottomBar: { width: '100%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  actionButton: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  actionButtonDisabled: { backgroundColor: '#9CA3AF' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

function __useCallback_wrapper(fn: () => void, deps: any[]) {
  return useCallback(fn, deps);
}