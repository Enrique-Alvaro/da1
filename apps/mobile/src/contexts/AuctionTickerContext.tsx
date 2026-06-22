import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AuctionTickerContextValue = {
  nowMs: number;
};

const AuctionTickerContext = createContext<AuctionTickerContextValue | null>(null);

export function AuctionTickerProvider({ children }: { children: React.ReactNode }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo(() => ({ nowMs }), [nowMs]);
  return <AuctionTickerContext.Provider value={value}>{children}</AuctionTickerContext.Provider>;
}

export function useAuctionTickerNow(): number {
  const ctx = useContext(AuctionTickerContext);
  return ctx?.nowMs ?? Date.now();
}
