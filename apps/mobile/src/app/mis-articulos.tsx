import { CustomNavBar } from '@/components/CustomNavBar';
import { cancelSubmission, fetchAuctionDetail, fetchMySubmissions } from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Submission = {
  submissionId: number;
  nombre: string | null;
  status: string;
  createdAt: string | null;
  basePrice: number | null;
  commission: number | null;
  auctionId: number | null;
  rejectionReason: string | null;
};

type AuctionInfo = {
  id: number;
  date: string | null;
  time: string | null;
  location: string | null;
  category: string | null;
  currency: string;
  status: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; accent: string; icon: string }> = {
  PENDING_REVIEW:     { label: 'En Revisión',  color: '#92400E', bg: '#FFFBEB', accent: '#F59E0B', icon: '🕐' },
  ACCEPTED:           { label: 'Aceptado',      color: '#065F46', bg: '#F0FDF4', accent: '#10B981', icon: '✓' },
  ASSIGNED_TO_AUCTION:{ label: 'En Subasta',    color: '#1E3A8A', bg: '#EFF6FF', accent: '#3B82F6', icon: '🏛' },
  REJECTED:           { label: 'Rechazado',     color: '#991B1B', bg: '#FFF5F5', accent: '#EF4444', icon: '✕' },
  RETURNED:           { label: 'Devuelto',      color: '#374151', bg: '#F9FAFB', accent: '#9CA3AF', icon: '↩' },
  UNKNOWN:            { label: 'Desconocido',   color: '#374151', bg: '#F9FAFB', accent: '#9CA3AF', icon: '?' },
};

const STEPS = ['PENDING_REVIEW', 'ACCEPTED', 'ASSIGNED_TO_AUCTION'];

const CATEGORY_LABELS: Record<string, string> = {
  comun: 'Común', especial: 'Especial', plata: 'Plata', oro: 'Oro', platino: 'Platino',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MisArticulosScreen() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [auctionMap, setAuctionMap] = useState<Record<number, AuctionInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await (fetchMySubmissions() as Promise<Submission[]>);
      const list = Array.isArray(result) ? result : [];
      setSubmissions(list);

      // Fetch auction details for items assigned to auctions
      const auctionIds = [...new Set(list.map(s => s.auctionId).filter((id): id is number => id != null))];
      if (auctionIds.length > 0) {
        const entries = await Promise.all(
          auctionIds.map(id =>
            (fetchAuctionDetail(id) as Promise<AuctionInfo>)
              .then(a => [id, a] as [number, AuctionInfo])
              .catch(() => null)
          )
        );
        const map: Record<number, AuctionInfo> = {};
        entries.forEach(e => { if (e) map[e[0]] = e[1]; });
        setAuctionMap(map);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar los artículos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function confirmCancel(id: number) {
    setCancelling(id);
    try {
      await cancelSubmission(id);
      setSubmissions(prev => prev.filter(s => s.submissionId !== id));
    } catch (e: any) {
      setError(e?.message || 'No se pudo cancelar el artículo.');
    } finally {
      setCancelling(null);
      setCancelConfirm(null);
    }
  }

  const total      = submissions.length;
  const revision   = submissions.filter(s => s.status === 'PENDING_REVIEW').length;
  const enSubasta  = submissions.filter(s => s.status === 'ASSIGNED_TO_AUCTION').length;

  const renderItem = ({ item }: { item: Submission }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.UNKNOWN;
    const auction = item.auctionId ? auctionMap[item.auctionId] : null;
    const stepIndex = STEPS.indexOf(item.status);
    const isInAuction = item.status === 'ASSIGNED_TO_AUCTION';
    const isConfirmingCancel = cancelConfirm === item.submissionId;

    return (
      <View style={[styles.card, { borderLeftColor: cfg.accent }]}>

        {/* Card header */}
        <View style={styles.cardTop}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.iconText, { color: cfg.accent }]}>{cfg.icon}</Text>
          </View>
          <View style={styles.cardTopInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.nombre ?? `Artículo #${item.submissionId}`}
            </Text>
            <Text style={styles.cardDate}>Enviado {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Progress bar (solo para los 3 primeros estados) */}
        {stepIndex >= 0 && (
          <View style={styles.progressRow}>
            {STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <View style={[
                  styles.progressDot,
                  i <= stepIndex ? { backgroundColor: cfg.accent } : { backgroundColor: '#E5E7EB' }
                ]}>
                  {i < stepIndex && <Text style={styles.progressDotCheck}>✓</Text>}
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.progressLine, i < stepIndex ? { backgroundColor: cfg.accent } : { backgroundColor: '#E5E7EB' }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Precios si están disponibles */}
        {(item.basePrice != null || item.commission != null) && (
          <View style={styles.priceRow}>
            {item.basePrice != null && (
              <View style={styles.priceChip}>
                <Text style={styles.priceChipLabel}>Precio base</Text>
                <Text style={styles.priceChipValue}>
                  ${item.basePrice.toLocaleString('es-AR')}
                </Text>
              </View>
            )}
            {item.commission != null && (
              <View style={styles.priceChip}>
                <Text style={styles.priceChipLabel}>Comisión</Text>
                <Text style={[styles.priceChipValue, { color: '#6B7280' }]}>
                  ${item.commission.toLocaleString('es-AR')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Detalle de subasta */}
        {isInAuction && auction && (
          <View style={styles.auctionBox}>
            <View style={styles.auctionBoxHeader}>
              <Text style={styles.auctionBoxTitle}>Subasta #{auction.id}</Text>
              <View style={[styles.auctionStatusDot,
                auction.status === 'live' ? { backgroundColor: '#10B981' } : { backgroundColor: '#3B82F6' }
              ]} />
              <Text style={[styles.auctionStatusLabel,
                auction.status === 'live' ? { color: '#10B981' } : { color: '#3B82F6' }
              ]}>
                {auction.status === 'live' ? 'En Vivo' : auction.status === 'closed' ? 'Cerrada' : 'Programada'}
              </Text>
            </View>

            <View style={styles.auctionDetails}>
              {auction.date && (
                <View style={styles.auctionDetailRow}>
                  <Text style={styles.auctionDetailIcon}>📅</Text>
                  <Text style={styles.auctionDetailText}>
                    {formatDate(auction.date)}{auction.time ? `  ·  ${auction.time.slice(0, 5)}` : ''}
                  </Text>
                </View>
              )}
              {auction.location && (
                <View style={styles.auctionDetailRow}>
                  <Text style={styles.auctionDetailIcon}>📍</Text>
                  <Text style={styles.auctionDetailText} numberOfLines={2}>{auction.location}</Text>
                </View>
              )}
              {auction.category && (
                <View style={styles.auctionDetailRow}>
                  <Text style={styles.auctionDetailIcon}>🏷</Text>
                  <Text style={styles.auctionDetailText}>
                    {CATEGORY_LABELS[auction.category] ?? auction.category}  ·  {auction.currency}
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              style={styles.viewAuctionBtn}
              onPress={() => router.push({ pathname: '/catalog', params: { catalogId: String(auction.id) } })}
            >
              <Text style={styles.viewAuctionBtnText}>Ver subasta →</Text>
            </Pressable>
          </View>
        )}

        {/* Motivo de rechazo */}
        {item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Motivo del rechazo</Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}

        {/* Cancelar */}
        {(item.status === 'PENDING_REVIEW') && (
          isConfirmingCancel ? (
            <View style={styles.cancelConfirmRow}>
              <Text style={styles.cancelConfirmText}>¿Confirmás la cancelación?</Text>
              <View style={styles.cancelConfirmBtns}>
                <Pressable style={styles.cancelConfirmNo} onPress={() => setCancelConfirm(null)}>
                  <Text style={styles.cancelConfirmNoText}>No</Text>
                </Pressable>
                <Pressable
                  style={[styles.cancelConfirmYes, cancelling === item.submissionId && { opacity: 0.5 }]}
                  onPress={() => confirmCancel(item.submissionId)}
                  disabled={cancelling === item.submissionId}
                >
                  <Text style={styles.cancelConfirmYesText}>
                    {cancelling === item.submissionId ? 'Cancelando...' : 'Sí, cancelar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.cancelBtn} onPress={() => setCancelConfirm(item.submissionId)}>
              <Text style={styles.cancelBtnText}>Cancelar solicitud</Text>
            </Pressable>
          )
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomNavBar />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis Artículos</Text>
          <Text style={styles.subtitle}>Seguí el estado de tus envíos</Text>
        </View>
        <Pressable style={styles.newBtn} onPress={() => router.push('/post-article')}>
          <Text style={styles.newBtnText}>+ Nuevo</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#D35400" />
      ) : error ? (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{total}</Text>
              <Text style={styles.statLbl}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#F59E0B' }]}>{revision}</Text>
              <Text style={styles.statLbl}>En revisión</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#3B82F6' }]}>{enSubasta}</Text>
              <Text style={styles.statLbl}>En subasta</Text>
            </View>
          </View>

          {submissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Todavía no enviaste artículos</Text>
              <Text style={styles.emptyText}>Enviá tu primer artículo para que lo evaluemos.</Text>
              <Pressable onPress={() => router.push('/post-article')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Enviar un artículo</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={submissions}
              keyExtractor={item => String(item.submissionId)}
              contentContainerStyle={styles.list}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  newBtn: { backgroundColor: '#D35400', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  loader: { marginTop: 60 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#D35400', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  statLbl: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },

  list: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18 },
  cardTopInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', lineHeight: 20 },
  cardDate: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  progressDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  progressDotCheck: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  progressLine: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: 4 },

  priceRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  priceChip: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  priceChipLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  priceChipValue: { fontSize: 16, fontWeight: '700', color: '#D35400' },

  auctionBox: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  auctionBoxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  auctionBoxTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A', flex: 1 },
  auctionStatusDot: { width: 8, height: 8, borderRadius: 4 },
  auctionStatusLabel: { fontSize: 12, fontWeight: '600' },
  auctionDetails: { gap: 6, marginBottom: 12 },
  auctionDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  auctionDetailIcon: { fontSize: 13, width: 18 },
  auctionDetailText: { fontSize: 13, color: '#1E40AF', flex: 1, lineHeight: 18 },
  viewAuctionBtn: { backgroundColor: '#2563EB', paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  viewAuctionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  rejectionBox: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FED7D7' },
  rejectionLabel: { fontSize: 11, fontWeight: '700', color: '#C53030', marginBottom: 4 },
  rejectionText: { fontSize: 13, color: '#742A2A' },

  cancelBtn: { marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },

  cancelConfirmRow: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#FFF5F5', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FCA5A5' },
  cancelConfirmText: { fontSize: 13, color: '#7F1D1D', fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  cancelConfirmBtns: { flexDirection: 'row', gap: 10 },
  cancelConfirmNo: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelConfirmNoText: { color: '#334155', fontWeight: '600' },
  cancelConfirmYes: { flex: 1, backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelConfirmYesText: { color: '#FFF', fontWeight: '700' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyBtn: { backgroundColor: '#D35400', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 10 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
