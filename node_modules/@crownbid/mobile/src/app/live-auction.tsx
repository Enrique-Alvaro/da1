import { ThemedText } from '@/components/themed-text';
import {
  enterLiveSession,
  fetchItem,
  fetchPaymentMethods,
  leaveLiveSession,
  placeBid,
  registerAsistente,
} from '@/services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type PaymentMethod = {
  id: number;
  type: string;
  lastDigits: string | null;
  entity: string | null;
  currency: string;
  status: string;
};

type BidResult = {
  currentHighestBid: number;
  minNextBid: number | null;
  maxNextBid: number | null;
};

export default function LiveAuctionScreen() {
  const router = useRouter();
  const { auctionId, itemId, title, currentBid, minNextBid, currency } =
    useLocalSearchParams<{
      auctionId: string;
      itemId: string;
      title: string;
      currentBid: string;
      minNextBid: string;
      currency: string;
    }>();

  const aucId = Number(auctionId);
  const itmId = Number(itemId);
  const displayCurrency = currency || 'ARS';

  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  const [highestBid, setHighestBid] = useState<number>(Number(currentBid) || 0);
  const [nextMin, setNextMin] = useState<number | null>(
    minNextBid ? Number(minNextBid) : null
  );
  const [bidAmount, setBidAmount] = useState(minNextBid || '');

  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  const sessionEntered = useRef(false);

  useEffect(() => {
    async function setup() {
      try {
        // 1. Registrar como asistente (idempotente)
        await registerAsistente(aucId);
        // 2. Entrar a la sesión live
        await enterLiveSession(aucId);
        sessionEntered.current = true;
        // 3. Cargar medios de pago verificados para la moneda de la subasta
        const pmResult = await (fetchPaymentMethods() as Promise<{ items: PaymentMethod[] }>);
        const verified = (pmResult?.items ?? []).filter(
          (m) => m.status === 'verificado' && m.currency === displayCurrency
        );
        setPaymentMethods(verified);
        if (verified.length > 0) setSelectedPaymentId(verified[0].id);
      } catch (e: any) {
        setSetupError(e?.message || 'No se pudo unirse a la subasta.');
      } finally {
        setSetupLoading(false);
      }
    }
    setup();

    return () => {
      if (sessionEntered.current) {
        leaveLiveSession(aucId).catch(() => {});
      }
    };
  }, [aucId]);

  async function handleBid() {
    setBidError(null);
    setBidSuccess(null);
    const amount = Number(bidAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      setBidError('Ingresá un monto válido.');
      return;
    }
    if (nextMin !== null && amount < nextMin) {
      setBidError(`El monto mínimo es ${displayCurrency} ${nextMin.toLocaleString('es-AR')}.`);
      return;
    }
    if (!selectedPaymentId) {
      setBidError('Seleccioná un medio de pago.');
      return;
    }
    setBidding(true);
    try {
      const result = await (placeBid(aucId, {
        itemId: itmId,
        amount,
        paymentMethodId: selectedPaymentId,
      }) as Promise<BidResult>);
      setHighestBid(result.currentHighestBid);
      setNextMin(result.minNextBid ?? null);
      setBidAmount(String(result.minNextBid ?? ''));
      setBidSuccess(`¡Puja de ${displayCurrency} ${amount.toLocaleString('es-AR')} registrada!`);
    } catch (e: any) {
      setBidError(e?.message || 'No se pudo registrar la puja.');
    } finally {
      setBidding(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header rojo live */}
      <View style={styles.liveBanner}>
        <View style={styles.liveHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={{ paddingRight: 15 }}>
              <ThemedText style={styles.backText}>←</ThemedText>
            </Pressable>
            <ThemedText style={styles.liveTitle}>🔴 SUBASTA EN VIVO</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.itemTitleBanner} numberOfLines={2}>
          {title || `Ítem #${itmId}`}
        </ThemedText>
      </View>

      {setupLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D35400" />
          <Text style={styles.loadingText}>Uniéndose a la subasta...</Text>
        </View>
      ) : setupError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{setupError}</Text>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Mejor oferta actual */}
          <View style={styles.highestBidBox}>
            <Text style={styles.highestBidLabel}>Mejor oferta actual</Text>
            <View style={styles.highestBidRow}>
              <Text style={styles.trendIcon}>↗</Text>
              <Text style={styles.highestBidAmount}>
                {highestBid > 0
                  ? `${displayCurrency} ${highestBid.toLocaleString('es-AR')}`
                  : 'Sin ofertas aún'}
              </Text>
            </View>
          </View>

          {/* Sección de puja */}
          <View style={styles.bidSection}>
            {nextMin !== null && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  Mínimo permitido: {displayCurrency} {nextMin.toLocaleString('es-AR')}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Tu puja ({displayCurrency})</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>{displayCurrency}</Text>
              <TextInput
                style={styles.textInput}
                value={bidAmount}
                onChangeText={(t) => { setBidAmount(t.replace(/[^0-9.]/g, '')); setBidError(null); setBidSuccess(null); }}
                keyboardType="numeric"
                placeholder={nextMin ? String(nextMin) : '0'}
                placeholderTextColor="#9AA0A6"
              />
            </View>

            {/* Selector de medio de pago */}
            {paymentMethods.length > 0 ? (
              <View style={styles.pmSection}>
                <Text style={styles.inputLabel}>Medio de pago</Text>
                {paymentMethods.map((pm) => (
                  <Pressable
                    key={pm.id}
                    style={[styles.pmOption, selectedPaymentId === pm.id && styles.pmOptionSelected]}
                    onPress={() => setSelectedPaymentId(pm.id)}
                  >
                    <Text style={[styles.pmOptionText, selectedPaymentId === pm.id && styles.pmOptionTextSelected]}>
                      {pm.entity ?? pm.type}{pm.lastDigits ? ` •••• ${pm.lastDigits}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  No tenés medios de pago verificados en {displayCurrency}. Registrá uno desde tu perfil.
                </Text>
              </View>
            )}

            {bidError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{bidError}</Text>
              </View>
            )}

            {bidSuccess && (
              <View style={styles.successBox}>
                <Text style={styles.successBoxText}>{bidSuccess}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {!setupLoading && !setupError && (
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.bidButton, (bidding || paymentMethods.length === 0) && styles.bidButtonDisabled]}
            onPress={handleBid}
            disabled={bidding || paymentMethods.length === 0}
          >
            {bidding
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.bidButtonText}>Realizar Puja</Text>
            }
          </Pressable>
          <Pressable style={styles.historyLink} onPress={() => router.push({
            pathname: '/bid-history',
            params: { auctionId: String(aucId), itemId: String(itmId), currency: displayCurrency, title: title ?? '' },
          })}>
            <Text style={styles.historyLinkText}>Ver historial de pujas →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  liveBanner: { backgroundColor: '#C81010', padding: 20, paddingTop: 55 },
  liveHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  liveTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 },
  itemTitleBanner: { color: '#FFF', fontSize: 14, opacity: 0.9 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: '#666', marginTop: 14, fontSize: 14 },
  errorText: { color: '#E74C3C', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: '#D35400', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },

  scrollContent: { paddingBottom: 120 },

  highestBidBox: { backgroundColor: '#FDF8ED', paddingVertical: 28, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0E6D2' },
  highestBidLabel: { fontSize: 13, color: '#888', marginBottom: 6 },
  highestBidRow: { flexDirection: 'row', alignItems: 'center' },
  trendIcon: { fontSize: 28, color: '#27AE60', marginRight: 8, fontWeight: 'bold' },
  highestBidAmount: { fontSize: 36, fontWeight: 'bold', color: '#002855' },

  bidSection: { padding: 20, gap: 14 },
  infoBox: { backgroundColor: '#F0F7FF', borderColor: '#B0D4FF', borderWidth: 1, borderRadius: 10, padding: 14 },
  infoBoxText: { color: '#0066CC', fontSize: 14 },

  inputLabel: { fontSize: 14, color: '#002855', fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D0D4DC', borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#FFF' },
  currencySymbol: { fontSize: 16, color: '#666', marginRight: 8, fontWeight: '600' },
  textInput: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#000', paddingVertical: 14 },

  pmSection: { gap: 8 },
  pmOption: { borderWidth: 1, borderColor: '#D0D4DC', borderRadius: 10, padding: 14 },
  pmOptionSelected: { borderColor: '#D35400', backgroundColor: '#FFF5EE' },
  pmOptionText: { fontSize: 14, color: '#333' },
  pmOptionTextSelected: { color: '#D35400', fontWeight: '700' },

  warningBox: { backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#FDE047', borderRadius: 10, padding: 14 },
  warningText: { color: '#854D0E', fontSize: 14 },
  errorBox: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 14 },
  errorBoxText: { color: '#DC2626', fontSize: 14 },
  successBox: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#6EE7B7', borderRadius: 10, padding: 14 },
  successBoxText: { color: '#065F46', fontWeight: '600', fontSize: 14 },

  bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE', gap: 10 },
  bidButton: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  bidButtonDisabled: { backgroundColor: '#9CA3AF' },
  bidButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  historyLink: { alignItems: 'center', paddingVertical: 4 },
  historyLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
