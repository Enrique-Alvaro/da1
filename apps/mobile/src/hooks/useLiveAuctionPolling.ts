import { fetchLiveAuctionState } from '@/services/api';
import type { LiveAuctionState } from '@/services/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const POLL_INTERVAL_MS = 3000;

type UseLiveAuctionPollingOptions = {
  auctionId: number;
  watchedItemId: number;
  enabled?: boolean;
  onFinalized?: (state: LiveAuctionState) => void;
  onItemChanged?: (state: LiveAuctionState) => void;
};

export function useLiveAuctionPolling({
  auctionId,
  watchedItemId,
  enabled = true,
  onFinalized,
  onItemChanged,
}: UseLiveAuctionPollingOptions) {
  const [liveState, setLiveState] = useState<LiveAuctionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizedRef = useRef(false);
  const onFinalizedRef = useRef(onFinalized);
  const onItemChangedRef = useRef(onItemChanged);

  onFinalizedRef.current = onFinalized;
  onItemChangedRef.current = onItemChanged;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const sync = useCallback(async () => {
    if (!enabled || !auctionId) return;
    try {
      const state = await fetchLiveAuctionState(auctionId, watchedItemId);
      setError(null);
      setLiveState(state);

      const currentId = state.currentItem?.id ?? null;
      if (currentId != null && currentId !== watchedItemId && !state.isFinalized) {
        onItemChangedRef.current?.(state);
      }

      const itemClosed =
        state.isFinalized &&
        (state.soldItemId === watchedItemId ||
          (state.soldItemId == null && state.currentItem?.id === watchedItemId));

      if (itemClosed && !finalizedRef.current) {
        finalizedRef.current = true;
        stopPolling();
        onFinalizedRef.current?.(state);
      }
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : 'No se pudo actualizar la subasta.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [auctionId, enabled, stopPolling, watchedItemId]);

  useEffect(() => {
    finalizedRef.current = false;
    setLoading(true);
    if (!enabled) {
      stopPolling();
      return undefined;
    }

    void sync();
    stopPolling();
    pollingRef.current = setInterval(() => {
      void sync();
    }, POLL_INTERVAL_MS);

    return () => stopPolling();
  }, [auctionId, enabled, stopPolling, sync, watchedItemId]);

  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active' && enabled && !finalizedRef.current) {
        void sync();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [enabled, sync]);

  return {
    liveState,
    loading,
    error,
    refresh: sync,
    isPolling: pollingRef.current != null,
  };
}
