import { fetchBidHistory } from '@/services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Bid = {
  id: number;
  itemId: number;
  amount: number;
  bidderNumber: number;
  isWinning: boolean;
};

export default function BidHistoryScreen() {
  const router = useRouter();
  const { auctionId, itemId, currency, title } = useLocalSearchParams<{
    auctionId: string; itemId: string; currency: string; title: string;
  }>();

  const [bids, setBids] = useState<Bid[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const displayCurrency = currency || 'ARS';

  useEffect(() => {
    async function load() {
      if (!auctionId) { setError('Subasta inválida.'); setLoading(false); return; }
      try {
        const result = await (fetchBidHistory(
          Number(auctionId),
          itemId ? Number(itemId) : undefined
        ) as Promise<{ totalBids: number; bids: Bid[] }>);
        setBids(result?.bids ?? []);
        setTotal(result?.totalBids ?? 0);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar el historial.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auctionId, itemId]);

  const leader = bids[0] ?? null;

  const renderBid = ({ item, index }: { item: Bid; index: number }) => {
    const isTop = index === 0;
    return (
      <View style={[styles.bidRow, isTop && styles.bidRowTop]}>
        <View style={styles.bidLeft}>
          <View style={[styles.bidIcon, isTop ? styles.bidIconTop : styles.bidIconNormal]}>
            <Text style={[styles.bidIconText, isTop ? styles.bidIconTextTop : styles.bidIconTextNormal]}>
              {isTop ? '↗' : '↘'}
            </Text>
          </View>
          <View>
            <Text style={styles.bidderName}>Postor #{item.bidderNumber}</Text>
            <Text style={styles.bidMeta}>Ítem #{item.itemId}</Text>
          </View>
        </View>
        <View style={styles.bidRight}>
          <Text style={[styles.bidAmount, isTop && styles.bidAmountTop]}>
            {displayCurrency} {item.amount.toLocaleString('es-AR')}
          </Text>
          {isTop && <Text style={styles.winningLabel}>Ganando</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>Historial de Pujas</Text>
            {title ? <Text style={styles.topBarSub} numberOfLines={1}>{title}</Text> : null}
          </View>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#D35400" />
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>← Volver</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {leader && (
              <View style={styles.leaderBanner}>
                <View>
                  <Text style={styles.leaderLabel}>Líder actual</Text>
                  <Text style={styles.leaderName}>Postor #{leader.bidderNumber}</Text>
                </View>
                <View style={styles.leaderRight}>
                  <Text style={styles.leaderLabel}>Mejor oferta</Text>
                  <Text style={styles.leaderAmount}>
                    {displayCurrency} {leader.amount.toLocaleString('es-AR')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalText}>
                {total} {total === 1 ? 'puja' : 'pujas'} registradas
              </Text>
            </View>

            {bids.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>Todavía no hay pujas para este ítem.</Text>
              </View>
            ) : (
              <FlatList
                data={bids}
                keyExtractor={b => String(b.id)}
                renderItem={renderBid}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#002855' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#002855' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  topBarSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  loader: { marginTop: 60 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#D35400', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },
  emptyText: { color: '#64748B', fontSize: 15 },

  leaderBanner: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FDF8ED', borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  leaderLabel: { fontSize: 12, color: '#92400E', fontWeight: '600', marginBottom: 4 },
  leaderName: { fontSize: 18, fontWeight: '700', color: '#002855' },
  leaderRight: { alignItems: 'flex-end' },
  leaderAmount: { fontSize: 24, fontWeight: '700', color: '#D35400' },

  totalRow: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFF' },
  totalText: { fontSize: 13, color: '#64748B' },

  listContent: { paddingBottom: 30 },

  bidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFF' },
  bidRowTop: { backgroundColor: '#FFFBEB' },
  bidLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bidIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  bidIconTop: { backgroundColor: '#FDE68A' },
  bidIconNormal: { backgroundColor: '#E2E8F0' },
  bidIconText: { fontSize: 16, fontWeight: 'bold' },
  bidIconTextTop: { color: '#92400E' },
  bidIconTextNormal: { color: '#475569' },
  bidderName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  bidMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  bidRight: { alignItems: 'flex-end' },
  bidAmount: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  bidAmountTop: { color: '#D35400' },
  winningLabel: { fontSize: 11, color: '#D35400', fontWeight: '600', marginTop: 2 },
});