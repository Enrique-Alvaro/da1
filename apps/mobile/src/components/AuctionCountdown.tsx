import { useAuctionCountdown } from '@/hooks/useAuctionCountdown';
import type { AuctionScheduleFields } from '@/types/auction';
import React from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

type AuctionCountdownProps = AuctionScheduleFields & {
  serverTime?: string | null;
  variant?: 'card' | 'detail' | 'live';
  onExpired?: () => void;
  onStatusChange?: (status: 'scheduled' | 'live' | 'closed') => void;
  style?: ViewStyle;
};

export function AuctionCountdown({
  date,
  time,
  endTime,
  status,
  serverTime,
  variant = 'card',
  onExpired,
  onStatusChange,
  style,
}: AuctionCountdownProps) {
  const countdown = useAuctionCountdown({
    date,
    time,
    endTime,
    status,
    serverTime,
    onExpired,
    onStatusChange,
  });

  const primaryStyle: TextStyle[] = [styles.primary, styles[`primary_${variant}`]];
  const secondaryStyle: TextStyle[] = [styles.secondary, styles[`secondary_${variant}`]];

  if (countdown.isUrgent && !countdown.isEnded) {
    primaryStyle.push(styles.primaryUrgent, styles[`primaryUrgent_${variant}`]);
  }
  if (countdown.isEnded) {
    primaryStyle.push(styles.primaryEnded);
    if (variant === 'live') {
      primaryStyle.push(styles.primaryEnded_live);
    }
  }

  return (
    <View style={[styles.container, style]} accessibilityLiveRegion="polite">
      <Text style={primaryStyle}>{countdown.primaryText}</Text>
      {countdown.secondaryText ? (
        <Text style={secondaryStyle}>{countdown.secondaryText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  primary: { fontSize: 13, fontWeight: '700', color: '#002855' },
  primary_card: { fontSize: 13 },
  primary_detail: { fontSize: 16 },
  primary_live: { color: '#FFFFFF', fontSize: 14 },
  secondary: { fontSize: 12, color: '#64748B' },
  secondary_card: { fontSize: 11 },
  secondary_detail: { fontSize: 13 },
  secondary_live: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  primaryUrgent: { color: '#B45309' },
  primaryUrgent_card: {},
  primaryUrgent_detail: { color: '#C2410C' },
  primaryUrgent_live: { color: '#FEF08A' },
  primaryEnded: { color: '#6B7280' },
  primaryEnded_live: { color: 'rgba(255,255,255,0.85)' },
});
