import { CustomNavBar } from '@/components/CustomNavBar';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAuctions, getAuthToken, getCurrentUser, logout } from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, View, Text } from 'react-native';

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

function CalendarGrid({ month, availableDates, selectedDate, onSelect }: {
  month: Date;
  availableDates: string[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toDateStr = (day: number) => `${year}-${pad(mon + 1)}-${pad(day)}`;

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calendarRow}>
          {row.map((day, di) => {
            if (!day) return <View key={di} style={styles.calendarCell} />;
            const dateStr = toDateStr(day);
            const isAvailable = availableDates.includes(dateStr);
            const isSelected = selectedDate === dateStr;
            return (
              <Pressable
                key={di}
                style={[
                  styles.calendarCell,
                  isSelected && styles.calendarCellSelected,
                  isAvailable && !isSelected && styles.calendarCellAvailable,
                ]}
                onPress={() => isAvailable && onSelect(dateStr)}
                disabled={!isAvailable}
              >
                <Text style={[
                  styles.calendarCellText,
                  isSelected && styles.calendarCellTextSelected,
                  isAvailable && !isSelected && styles.calendarCellTextAvailable,
                  !isAvailable && styles.calendarCellTextDisabled,
                ]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const isGuest = !getAuthToken();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [userLoading, setUserLoading] = useState(!isGuest);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
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

  const availableDates = useMemo(() => {
    const dates = auctions.map(a => a.date).filter(Boolean) as string[];
    return [...new Set(dates)].sort();
  }, [auctions]);

  const visibleAuctions = useMemo(() => {
    const sorted = [...auctions].sort((a, b) => {
      const aLive = a.status === 'live';
      const bLive = b.status === 'live';
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return 0;
    });
    return sorted
      .filter(a => !showLiveOnly || a.status === 'live')
      .filter(a => !selectedCategory || a.category === selectedCategory)
      .filter(a => !selectedDate || a.date === selectedDate);
  }, [auctions, showLiveOnly, selectedCategory, selectedDate]);

  const hasActiveFilters = showLiveOnly || !!selectedCategory || !!selectedDate;

  const noAuctionsMessage = 'No hay subastas disponibles con los filtros seleccionados.';

  function formatDateChip(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

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

      <CustomNavBar />

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

      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Subastas</ThemedText>
        <View style={styles.sectionHeaderRight}>
          <Pressable
            style={[styles.filterButton, showLiveOnly && styles.filterButtonActive]}
            onPress={() => setShowLiveOnly((prev) => !prev)}
          >
            <Text style={[styles.filterButtonText, showLiveOnly && styles.filterButtonTextActive]}>
              {showLiveOnly ? '● En vivo' : 'En vivo'}
            </Text>
          </Pressable>
          {hasActiveFilters && (
            <Pressable
              style={styles.clearButton}
              onPress={() => { setShowLiveOnly(false); setSelectedCategory(null); setSelectedDate(null); }}
            >
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Filtro por categoría */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {[null, 'comun', 'especial', 'plata', 'oro', 'platino'].map((cat) => (
          <Pressable
            key={cat ?? 'all'}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat ? (CATEGORY_LABELS[cat] ?? cat) : 'Todas'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Filtro por fecha — botón que abre calendario */}
      <View style={styles.dateFilterRow}>
        <Pressable
          style={[styles.chip, selectedDate !== null && styles.chipDateActive]}
          onPress={() => {
            if (selectedDate) {
              setCalendarMonth(new Date(selectedDate + 'T00:00:00'));
            }
            setCalendarVisible(true);
          }}
        >
          <Text style={[styles.chipText, selectedDate !== null && styles.chipTextActive]}>
            {selectedDate ? `📅 ${formatDateChip(selectedDate)}` : '📅 Fecha'}
          </Text>
        </Pressable>
        {selectedDate && (
          <Pressable onPress={() => setSelectedDate(null)} style={styles.dateChipClear}>
            <Text style={styles.dateChipClearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Calendario Modal */}
      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <Pressable style={styles.calendarOverlay} onPress={() => setCalendarVisible(false)}>
          <Pressable style={styles.calendarBox} onPress={(e) => e.stopPropagation()}>
            {/* Navegación de mes */}
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => setCalendarMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })}>
                <Text style={styles.calendarNavBtn}>‹</Text>
              </Pressable>
              <Text style={styles.calendarMonthTitle}>
                {calendarMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable onPress={() => setCalendarMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })}>
                <Text style={styles.calendarNavBtn}>›</Text>
              </Pressable>
            </View>

            {/* Días de semana */}
            <View style={styles.calendarWeekRow}>
              {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                <Text key={d} style={styles.calendarWeekDay}>{d}</Text>
              ))}
            </View>

            {/* Grilla de días */}
            <CalendarGrid
              month={calendarMonth}
              availableDates={availableDates}
              selectedDate={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setCalendarVisible(false); }}
            />

            <Pressable style={styles.calendarClearBtn} onPress={() => { setSelectedDate(null); setCalendarVisible(false); }}>
              <Text style={styles.calendarClearBtnText}>Ver todas las fechas</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#D35400" />
      ) : error ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>{error}</ThemedText>
        </View>
      ) : visibleAuctions.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>{noAuctionsMessage}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={visibleAuctions}
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

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 8 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, color: '#002855', fontWeight: 'bold' },
  filterButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F3F4F6', borderRadius: 999 },
  filterButtonActive: { backgroundColor: '#D35400' },
  filterButtonText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  filterButtonTextActive: { color: '#FFFFFF' },
  clearButton: { paddingVertical: 6, paddingHorizontal: 10 },
  clearButtonText: { fontSize: 12, color: '#D35400', fontWeight: '600' },
  chipsRow: { maxHeight: 44, marginBottom: 4 },
  chipsContent: { paddingHorizontal: 15, gap: 8, alignItems: 'center' },
  chip: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#F3F4F6', borderRadius: 999 },
  chipActive: { backgroundColor: '#D35400' },
  chipDateActive: { backgroundColor: '#002855' },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  dateFilterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 4, gap: 6 },
  dateChipClear: { paddingHorizontal: 8, paddingVertical: 4 },
  dateChipClearText: { color: '#002855', fontSize: 14, fontWeight: '700' },

  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  calendarBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: 320, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calendarNavBtn: { fontSize: 28, color: '#002855', paddingHorizontal: 8, fontWeight: '300' },
  calendarMonthTitle: { fontSize: 15, fontWeight: '700', color: '#002855', textTransform: 'capitalize' },
  calendarWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calendarWeekDay: { flex: 1, textAlign: 'center', fontSize: 12, color: '#888', fontWeight: '600' },
  calendarRow: { flexDirection: 'row', marginBottom: 4 },
  calendarCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calendarCellAvailable: { backgroundColor: '#FFF3E0' },
  calendarCellSelected: { backgroundColor: '#D35400' },
  calendarCellText: { fontSize: 14, color: '#CCC' },
  calendarCellTextDisabled: { color: '#CCC' },
  calendarCellTextAvailable: { color: '#D35400', fontWeight: '700' },
  calendarCellTextSelected: { color: '#FFF', fontWeight: '700' },
  calendarClearBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  calendarClearBtnText: { color: '#002855', fontSize: 14, fontWeight: '600' },
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
