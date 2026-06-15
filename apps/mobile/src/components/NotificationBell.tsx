import {
  fetchUnreadNotificationCount,
  getAuthToken,
} from '@/services/api';
import { formatUnreadBadge } from '@/services/notification-mapper';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

type NotificationBellProps = {
  color?: string;
  onCountChange?: (count: number) => void;
};

export function NotificationBell({ color = '#002855', onCountChange }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (!getAuthToken()) {
      setUnreadCount(0);
      onCountChange?.(0);
      return;
    }
    try {
      const result = await fetchUnreadNotificationCount();
      const count = result.unreadCount ?? 0;
      setUnreadCount(count);
      onCountChange?.(count);
    } catch {
      /* keep previous count on transient errors */
    }
  }, [onCountChange]);

  useEffect(() => {
    void loadCount();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadCount();
    });
    return () => sub.remove();
  }, [loadCount]);

  const badge = formatUnreadBadge(unreadCount);

  return (
    <Pressable
      style={styles.button}
      onPress={() => router.push('/notifications')}
      accessibilityLabel="Notificaciones"
    >
      <Text style={[styles.icon, { color }]}>🔔</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 6, position: 'relative' },
  icon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
