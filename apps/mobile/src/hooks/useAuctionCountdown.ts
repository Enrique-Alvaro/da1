import { useAuctionTickerNow } from '@/contexts/AuctionTickerContext';
import type { AuctionScheduleFields } from '@/types/auction';
import {
  computeAuctionCountdown,
  resolveServerNowMs,
  type AuctionCountdownState,
} from '@/utils/auctionTime';
import { useEffect, useMemo, useRef, useState } from 'react';

type UseAuctionCountdownOptions = AuctionScheduleFields & {
  serverTime?: string | null;
  onExpired?: () => void;
  onStatusChange?: (status: AuctionCountdownState['effectiveStatus']) => void;
};

export function useAuctionCountdown({
  date,
  time,
  endTime,
  status,
  serverTime,
  onExpired,
  onStatusChange,
}: UseAuctionCountdownOptions): AuctionCountdownState {
  const tickerNow = useAuctionTickerNow();
  const [serverAnchor, setServerAnchor] = useState<{ serverMs: number; localMs: number } | null>(
    null
  );

  useEffect(() => {
    if (!serverTime) {
      setServerAnchor(null);
      return;
    }
    const serverMs = resolveServerNowMs(serverTime);
    setServerAnchor({ serverMs, localMs: Date.now() });
  }, [serverTime]);

  const nowMs = useMemo(() => {
    if (!serverAnchor) return tickerNow;
    return serverAnchor.serverMs + (tickerNow - serverAnchor.localMs);
  }, [serverAnchor, tickerNow]);

  const countdown = useMemo(
    () => computeAuctionCountdown({ date, time, endTime, status, nowMs }),
    [date, time, endTime, status, nowMs]
  );

  const expiredRef = useRef(false);
  const lastStatusRef = useRef(countdown.effectiveStatus);

  useEffect(() => {
    expiredRef.current = false;
    lastStatusRef.current = countdown.effectiveStatus;
  }, [date, time, endTime, status]);

  useEffect(() => {
    if (countdown.effectiveStatus !== status) {
      onStatusChange?.(countdown.effectiveStatus);
    }
  }, [countdown.effectiveStatus, status, onStatusChange]);

  useEffect(() => {
    if (lastStatusRef.current !== countdown.effectiveStatus) {
      lastStatusRef.current = countdown.effectiveStatus;
      onStatusChange?.(countdown.effectiveStatus);
    }
  }, [countdown.effectiveStatus, onStatusChange]);

  useEffect(() => {
    if (countdown.isEnded && !expiredRef.current) {
      expiredRef.current = true;
      onExpired?.();
    }
  }, [countdown.isEnded, onExpired]);

  return countdown;
}
