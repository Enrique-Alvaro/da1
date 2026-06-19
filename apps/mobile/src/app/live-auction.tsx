import { ThemedText } from '@/components/themed-text';
import { useLiveAuctionPolling } from '@/hooks/useLiveAuctionPolling';
import {
  enterLiveSession,
  fetchItemResult,
  fetchPaymentMethods,
  leaveLiveSession,
  placeBid,
  registerAsistente,
} from '@/services/api';
import type { ItemFinalizationResult, LiveAuctionState } from '@/services/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function ResultPanel({
  result,
  currency,
  onViewPurchases,
  onContinue,
  showContinue,
}: {
  result: ItemFinalizationResult;
  currency: string;
  onViewPurchases: () => void;
  onContinue?: () => void;
  showContinue?: boolean;
}) {
  const title = result.productTitle ?? result.title ?? 'Artículo';
  const fmt = (n: number | null | undefined) =>
    n != null ? `${currency} ${n.toLocaleString('es-AR')}` : '—';

  if (result.resultType === 'BIDDER_WON' && result.isCurrentUserWinner) {
    return (
      <View style={[styles.resultBox, styles.resultWin]}>
        <Text style={styles.resultEmoji}>🏆</Text>
        <Text style={styles.resultTitle}>¡Ganaste este artículo!</Text>
        <Text style={styles.resultItemName}>{title}</Text>
        <Text style={styles.resultLine}>Tu oferta de {fmt(result.finalAmount)} fue la oferta ganadora.</Text>
        {result.finalizedAt ? (
          <Text style={styles.resultMeta}>Finalizado: {new Date(result.finalizedAt).toLocaleString('es-AR')}</Text>
        ) : null}
        <Text style={styles.resultLine}>Comisión: {fmt(result.commissionAmount)}</Text>
        <Text style={styles.resultLine}>Envío: {fmt(result.shippingAmount)}</Text>
        <Text style={styles.resultTotal}>Total a pagar: {fmt(result.totalAmount)}</Text>
        <Pressable style={styles.resultBtn} onPress={onViewPurchases}>
          <Text style={styles.resultBtnText}>Ver detalle de compra</Text>
        </Pressable>
      </View>
    );
  }

  if (result.resultType === 'COMPANY_PURCHASED') {
    return (
      <View style={[styles.resultBox, styles.resultNeutral]}>
        <Text style={styles.resultEmoji}>🏁</Text>
        <Text style={styles.resultTitle}>Finalizado sin pujas</Text>
        <Text style={styles.resultItemName}>{title}</Text>
        <Text style={styles.resultLine}>
          La empresa adquirió el artículo por el precio base de {fmt(result.basePrice)}.
        </Text>
        {showContinue && onContinue ? (
          <Pressable style={styles.resultBtnSecondary} onPress={onContinue}>
            <Text style={styles.resultBtnSecondaryText}>Ver próximo artículo</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.resultBox, styles.resultLose]}>
      <Text style={styles.resultEmoji}>📋</Text>
      <Text style={styles.resultTitle}>El artículo fue adjudicado</Text>
      <Text style={styles.resultItemName}>{title}</Text>
      <Text style={styles.resultLine}>Oferta ganadora: {fmt(result.finalAmount)}</Text>
      {result.winnerDisplayName ? (
        <Text style={styles.resultMeta}>Adjudicado a {result.winnerDisplayName}</Text>
      ) : null}
      {showContinue && onContinue ? (
        <Pressable style={styles.resultBtnSecondary} onPress={onContinue}>
          <Text style={styles.resultBtnSecondaryText}>Continuar con la subasta</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

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
  const [nextMin, setNextMin] = useState<number | null>(minNextBid ? Number(minNextBid) : null);
  const [bidAmount, setBidAmount] = useState(minNextBid || '');
  const [isHighestBidder, setIsHighestBidder] = useState(false);
  const [showOutbidBanner, setShowOutbidBanner] = useState(false);

  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  const [itemFinalized, setItemFinalized] = useState(false);
  const [finalResult, setFinalResult] = useState<ItemFinalizationResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [waitingNextItem, setWaitingNextItem] = useState(false);

  const sessionEntered = useRef(false);
  const wasHighestRef = useRef<boolean | null>(null);

  const loadResult = useCallback(async () => {
    setResultLoading(true);
    try {
      const result = await fetchItemResult(aucId, itmId);
      setFinalResult(result);
      setItemFinalized(result.resultStatus === 'FINALIZED');
    } catch {
      setBidError('No se pudo obtener el resultado final del artículo.');
    } finally {
      setResultLoading(false);
    }
  }, [aucId, itmId]);

  const handleFinalized = useCallback(
    (_state: LiveAuctionState) => {
      setItemFinalized(true);
      void loadResult();
    },
    [loadResult]
  );

  const handleItemChanged = useCallback(
    (state: LiveAuctionState) => {
      if (state.status === 'closed') {
        setAuctionEnded(true);
        return;
      }
      if (state.currentItem && state.currentItem.id !== itmId) {
        setWaitingNextItem(true);
      }
    },
    [itmId]
  );

  const { liveState, error: pollError, refresh } = useLiveAuctionPolling({
    auctionId: aucId,
    watchedItemId: itmId,
    enabled: !setupLoading && !setupError && !itemFinalized,
    onFinalized: handleFinalized,
    onItemChanged: handleItemChanged,
  });

  useEffect(() => {
    if (!liveState) return;

    if (liveState.currentHighestBid != null) {
      setHighestBid(liveState.currentHighestBid);
    }
    if (liveState.minNextBid != null) {
      setNextMin(liveState.minNextBid);
      if (!bidAmount) setBidAmount(String(liveState.minNextBid));
    }

    if (wasHighestRef.current === true && liveState.isHighestBidder === false && !itemFinalized) {
      setShowOutbidBanner(true);
    }
    wasHighestRef.current = liveState.isHighestBidder;
    setIsHighestBidder(liveState.isHighestBidder);

    if (liveState.status === 'closed') {
      setAuctionEnded(true);
    }
  }, [liveState, itemFinalized, bidAmount]);

  useEffect(() => {
    if (auctionEnded && !itemFinalized && !resultLoading) {
      void loadResult();
    }
  }, [auctionEnded, itemFinalized, resultLoading, loadResult]);

  useEffect(() => {
    async function setup() {
      try {
        await registerAsistente(aucId);
        await enterLiveSession(aucId);
        sessionEntered.current = true;
        const pmResult = await (fetchPaymentMethods() as Promise<{ items: PaymentMethod[] }>);
        const verified = (pmResult?.items ?? []).filter(
          (m) => m.status === 'verificado' && m.currency === displayCurrency
        );
        setPaymentMethods(verified);
        if (verified.length > 0) setSelectedPaymentId(verified[0].id);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'No se pudo unirse a la subasta.';
        setSetupError(message);
      } finally {
        setSetupLoading(false);
      }
    }
    void setup();

    return () => {
      if (sessionEntered.current) {
        leaveLiveSession(aucId).catch(() => {});
      }
    };
  }, [aucId, displayCurrency]);

  function goToNextItem() {
    if (!liveState?.currentItem) return;
    router.replace({
      pathname: '/live-auction',
      params: {
        auctionId: String(aucId),
        itemId: String(liveState.currentItem.id),
        title: liveState.currentItem.catalogDescription ?? '',
        currentBid: String(liveState.currentHighestBid ?? liveState.currentItem.basePrice),
        minNextBid: liveState.minNextBid != null ? String(liveState.minNextBid) : '',
        currency: displayCurrency,
      },
    });
  }

  async function handleBid() {
    if (itemFinalized) {
      setBidError('El artículo ya finalizó y no admite nuevas ofertas.');
      void loadResult();
      return;
    }

    setBidError(null);
    setBidSuccess(null);
    setShowOutbidBanner(false);
    const amount = Number(bidAmount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
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
      setIsHighestBidder(true);
      wasHighestRef.current = true;
      void refresh();
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : 'No se pudo registrar la puja.';
      const lower = message.toLowerCase();
      if (
        lower.includes('finaliz') ||
        lower.includes('cerrad') ||
        lower.includes('not open') ||
        lower.includes('auction_not_open')
      ) {
        setItemFinalized(true);
        void loadResult();
        setBidError('El artículo ya finalizó y no admite nuevas ofertas.');
      } else {
        setBidError(message);
      }
    } finally {
      setBidding(false);
    }
  }

  const biddingDisabled =
    itemFinalized || bidding || paymentMethods.length === 0 || auctionEnded;

  return (
    <View style={styles.container}>
      <View style={styles.liveBanner}>
        <View style={styles.liveHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
              style={{ paddingRight: 15 }}
            >
              <ThemedText style={styles.backText}>←</ThemedText>
            </Pressable>
            <ThemedText style={styles.liveTitle}>
              {auctionEnded ? 'SUBASTA FINALIZADA' : '🔴 SUBASTA EN VIVO'}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={styles.itemTitleBanner} numberOfLines={2}>
          {title || liveState?.currentItem?.catalogDescription || `Ítem #${itmId}`}
        </ThemedText>
      </View>

      {showOutbidBanner && !itemFinalized ? (
        <View style={styles.outbidBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.outbidTitle}>Te han superado</Text>
            <Text style={styles.outbidBody}>
              Otro usuario hizo una puja mayor en &apos;{title || `Ítem #${itmId}`}&apos;
            </Text>
          </View>
          <Pressable onPress={() => setShowOutbidBanner(false)}>
            <Text style={styles.outbidClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      {setupLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D35400" />
          <Text style={styles.loadingText}>Uniéndose a la subasta...</Text>
        </View>
      ) : setupError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{setupError}</Text>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Volver</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {pollError ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{pollError}</Text>
            </View>
          ) : null}

          {waitingNextItem && !itemFinalized ? (
            <View style={styles.waitingBox}>
              <Text style={styles.waitingTitle}>Esperando el próximo artículo</Text>
              <Text style={styles.waitingText}>El próximo artículo comenzará pronto.</Text>
            </View>
          ) : null}

          {itemFinalized ? (
            resultLoading ? (
              <View style={styles.centeredInline}>
                <ActivityIndicator color="#D35400" />
                <Text style={styles.loadingText}>Obteniendo resultado...</Text>
              </View>
            ) : finalResult ? (
              <ResultPanel
                result={finalResult}
                currency={displayCurrency}
                onViewPurchases={() => router.push('/my-purchases' as never)}
                onContinue={goToNextItem}
                showContinue={!auctionEnded && liveState?.currentItem != null && liveState.currentItem.id !== itmId}
              />
            ) : null
          ) : (
            <>
              <View style={styles.highestBidBox}>
                <Text style={styles.highestBidLabel}>Puja más alta actual</Text>
                <View style={styles.highestBidRow}>
                  <Text style={styles.trendIcon}>{isHighestBidder ? '↗' : '↘'}</Text>
                  <Text style={styles.highestBidAmount}>
                    {highestBid > 0
                      ? `${displayCurrency} ${highestBid.toLocaleString('es-AR')}`
                      : 'Sin ofertas aún'}
                  </Text>
                </View>
                {isHighestBidder ? (
                  <Text style={styles.leadingText}>Sos el mejor postor actualmente</Text>
                ) : null}
              </View>

              <View style={styles.bidSection}>
                {nextMin !== null && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxText}>
                      Mínimo permitido: {displayCurrency} {nextMin.toLocaleString('es-AR')}
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Realiza tu puja ({displayCurrency})</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>{displayCurrency}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bidAmount}
                    onChangeText={(t) => {
                      setBidAmount(t.replace(/[^0-9.]/g, ''));
                      setBidError(null);
                      setBidSuccess(null);
                    }}
                    keyboardType="numeric"
                    placeholder={nextMin ? String(nextMin) : '0'}
                    placeholderTextColor="#9AA0A6"
                    editable={!biddingDisabled}
                  />
                </View>
                <Text style={styles.currentBidHint}>
                  Puja actual: {displayCurrency} {highestBid.toLocaleString('es-AR')}
                </Text>

                {paymentMethods.length > 0 ? (
                  <View style={styles.pmSection}>
                    <Text style={styles.inputLabel}>Medio de pago</Text>
                    {paymentMethods.map((pm) => (
                      <Pressable
                        key={pm.id}
                        style={[styles.pmOption, selectedPaymentId === pm.id && styles.pmOptionSelected]}
                        onPress={() => setSelectedPaymentId(pm.id)}
                        disabled={biddingDisabled}
                      >
                        <Text
                          style={[
                            styles.pmOptionText,
                            selectedPaymentId === pm.id && styles.pmOptionTextSelected,
                          ]}
                        >
                          {pm.entity ?? pm.type}
                          {pm.lastDigits ? ` •••• ${pm.lastDigits}` : ''}
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

                {bidError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{bidError}</Text>
                  </View>
                ) : null}

                {bidSuccess ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successBoxText}>{bidSuccess}</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {!setupLoading && !setupError && !itemFinalized ? (
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.bidButton, biddingDisabled && styles.bidButtonDisabled]}
            onPress={() => void handleBid()}
            disabled={biddingDisabled}
          >
            {bidding ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.bidButtonText}>
                {auctionEnded ? 'Subasta finalizada' : 'Realizar Puja'}
              </Text>
            )}
          </Pressable>
          <Pressable
            style={styles.historyLink}
            onPress={() =>
              router.push({
                pathname: '/bid-history',
                params: {
                  auctionId: String(aucId),
                  itemId: String(itmId),
                  currency: displayCurrency,
                  title: title ?? '',
                },
              })
            }
          >
            <Text style={styles.historyLinkText}>Ver historial de pujas →</Text>
          </Pressable>
        </View>
      ) : null}
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

  outbidBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    padding: 14,
    gap: 10,
  },
  outbidTitle: { fontWeight: '700', color: '#C2410C', fontSize: 14 },
  outbidBody: { color: '#9A3412', fontSize: 13, marginTop: 2 },
  outbidClose: { color: '#9A3412', fontSize: 16, padding: 4 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centeredInline: { alignItems: 'center', padding: 30 },
  loadingText: { color: '#666', marginTop: 14, fontSize: 14 },
  errorText: { color: '#E74C3C', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: '#D35400', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },

  scrollContent: { paddingBottom: 120 },

  waitingBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  waitingTitle: { fontWeight: '700', color: '#1D4ED8', fontSize: 15 },
  waitingText: { color: '#3B82F6', marginTop: 4, fontSize: 13 },

  highestBidBox: {
    backgroundColor: '#FDF8ED',
    paddingVertical: 28,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D2',
  },
  highestBidLabel: { fontSize: 13, color: '#888', marginBottom: 6 },
  highestBidRow: { flexDirection: 'row', alignItems: 'center' },
  trendIcon: { fontSize: 28, color: '#27AE60', marginRight: 8, fontWeight: 'bold' },
  highestBidAmount: { fontSize: 36, fontWeight: 'bold', color: '#002855' },
  leadingText: { marginTop: 8, color: '#059669', fontWeight: '600', fontSize: 13 },

  bidSection: { padding: 20, gap: 14 },
  infoBox: { backgroundColor: '#F0F7FF', borderColor: '#B0D4FF', borderWidth: 1, borderRadius: 10, padding: 14 },
  infoBoxText: { color: '#0066CC', fontSize: 14 },
  currentBidHint: { fontSize: 12, color: '#64748B' },

  inputLabel: { fontSize: 14, color: '#002855', fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D4DC',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
  },
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

  resultBox: { margin: 16, padding: 20, borderRadius: 14, borderWidth: 1 },
  resultWin: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  resultLose: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  resultNeutral: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  resultEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  resultTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  resultItemName: { fontSize: 16, fontWeight: '600', color: '#334155', textAlign: 'center', marginVertical: 8 },
  resultLine: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 4 },
  resultMeta: { fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 8 },
  resultTotal: { fontSize: 16, fontWeight: '700', color: '#D35400', textAlign: 'center', marginTop: 8 },
  resultBtn: {
    backgroundColor: '#D35400',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  resultBtnText: { color: '#FFF', fontWeight: '700' },
  resultBtnSecondary: {
    borderWidth: 1,
    borderColor: '#D35400',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  resultBtnSecondaryText: { color: '#D35400', fontWeight: '700' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 10,
  },
  bidButton: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  bidButtonDisabled: { backgroundColor: '#9CA3AF' },
  bidButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  historyLink: { alignItems: 'center', paddingVertical: 4 },
  historyLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
