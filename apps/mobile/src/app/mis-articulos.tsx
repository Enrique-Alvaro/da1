import { CustomNavBar } from '@/components/CustomNavBar';
import { cancelSubmission, fetchAuctionDetail, fetchMySubmissions, getAuthToken } from '@/services/api';
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
import { ThemedView } from '@/components/themed-view';

type Submission = {
  submissionId: number;
  nombre: string | null;
  status: string;
  createdAt: string | null;
  basePrice: number | null;
  commission: number | null;
  auctionId: number | null;
  rejectionReason: string | null;
  depositLocation?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCompany?: string | null;
  artistOrDesigner?: string | null;
  history?: string | null;
  components?: string | null;
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

function normalizeSubmissionStatus(status: string | null | undefined): string {
  return String(status ?? '').trim().toUpperCase();
}

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
      const auctionIds = [...new Set(list.map(s => s.auctionId).filter((id): id is number => id != null))];
      if (auctionIds.length > 0) {
        const entries = await Promise.all(
          auctionIds.map(id => (fetchAuctionDetail(id) as Promise<AuctionInfo>).then(a => [id, a] as [number, AuctionInfo]).catch(() => null))
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

  const isAuthError = error?.toLowerCase().includes('iniciar sesión');
  const total = submissions.length;
  const revision = submissions.filter(s => normalizeSubmissionStatus(s.status) === 'PENDING_REVIEW').length;
  const enSubasta = submissions.filter(s => normalizeSubmissionStatus(s.status) === 'ASSIGNED_TO_AUCTION').length;

  const renderItem = ({ item }: { item: Submission }) => {
    const status = normalizeSubmissionStatus(item.status);
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN;
    const auction = item.auctionId ? auctionMap[item.auctionId] : null;
    const stepIndex = STEPS.indexOf(status);
    const isInAuction = status === 'ASSIGNED_TO_AUCTION';
    const isConfirmingCancel = cancelConfirm === item.submissionId;
    const isCancellable = status === 'PENDING_REVIEW';
    return (
      <View style={[styles.card, { borderLeftColor: cfg.accent }]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}><Text style={[styles.iconText, { color: cfg.accent }]}>{cfg.icon}</Text></View>
          <View style={styles.cardTopInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.nombre ?? `Artículo #${item.submissionId}`}</Text>
            <Text style={styles.cardDate}>Enviado {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}><Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text></View>
        </View>
        {stepIndex >= 0 && (
          <View style={styles.progressRow}>
            {STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <View style={[styles.progressDot, i <= stepIndex ? { backgroundColor: cfg.accent } : { backgroundColor: '#E5E7EB' }]}>{i < stepIndex && <Text style={styles.progressDotCheck}>✓</Text>}</View>
                {i < STEPS.length - 1 && (<View style={[styles.progressLine, i < stepIndex ? { backgroundColor: cfg.accent } : { backgroundColor: '#E5E7EB' }]} />)}
              </React.Fragment>
            ))}
          </View>
        )}
        {(item.depositLocation || item.insurancePolicyNumber) ? (
          <View style={styles.consignmentBox}>
            {item.depositLocation ? (
              <Text style={styles.consignmentText}>Depósito: {item.depositLocation}</Text>
            ) : null}
            {item.insurancePolicyNumber ? (
              <Text style={styles.consignmentText}>
                Seguro: {item.insurancePolicyNumber}
                {item.insuranceCompany ? ` — ${item.insuranceCompany}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <CustomNavBar />
        {!isAuthError && (
          <View style={styles.header}>
              <Text style={styles.title}>Mis Artículos</Text>
              <Pressable style={styles.newBtn} onPress={() => router.push('/post-article')}><Text style={styles.newBtnText}>+ Nuevo</Text></Pressable>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#D35400" />
        ) : isAuthError ? (
          <View style={styles.authGate}>
            <Text style={styles.authGateIcon}>🔒</Text>
            <Text style={styles.authGateTitle}>Acceso restringido</Text>
            <Text style={styles.authGateText}>Debés iniciar sesión para acceder a esta sección.</Text>
            <Pressable style={styles.authGateButton} onPress={() => router.replace('/login')}>
              <Text style={styles.authGateButtonText}>Iniciar sesión</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList 
            data={submissions} 
            renderItem={renderItem} 
            keyExtractor={item => String(item.submissionId)} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold' },
  newBtn: { backgroundColor: '#D35400', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, justifyContent: 'center' },
  newBtnText: { color: '#FFF', fontWeight: 'bold' },
  loader: { marginTop: 60 },
  listContainer: { paddingBottom: 35 },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 20 },
  cardTopInfo: { flex: 1, marginLeft: 10 },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: '#0A1E3F' },
  consignmentBox: { marginTop: 10, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 8, gap: 4 },
  consignmentText: { fontSize: 12, color: '#374151' },
  cardDate: { fontSize: 12, color: '#94A3B8' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  progressRow: { flexDirection: 'row', marginTop: 14, paddingHorizontal: 4 },
  progressDot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  progressDotCheck: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  progressLine: { flex: 1, height: 2, alignSelf: 'center' },
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  authGateIcon: { fontSize: 48, marginBottom: 16 },
  authGateTitle: { fontSize: 20, fontWeight: 'bold', color: '#002855' },
  authGateText: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24 },
  authGateButton: { backgroundColor: '#D35400', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
  authGateButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});