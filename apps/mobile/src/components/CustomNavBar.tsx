import { ThemedText } from '@/components/themed-text';
import { getAuthToken } from '@/services/api';
import {
  alertLoginRequired,
  alertPendingAdmission,
  isUserAdmitted,
  resolveClientSession,
} from '@/utils/clientPermissions';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const PROTECTED_PATHS = new Set(['/mis-articulos', '/perfil', '/payment-methods']);
const ADMISSION_REQUIRED_PATHS = new Set(['/post-article']);

export function CustomNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Inicio', path: '/home' },
    { label: 'Mis Artículos', path: '/mis-articulos' },
    { label: 'Perfil', path: '/perfil' },
    { label: 'Vender', path: '/post-article' },
  ];

  async function onNavigate(path: string) {
    if (!getAuthToken()) {
      if (PROTECTED_PATHS.has(path) || ADMISSION_REQUIRED_PATHS.has(path)) {
        alertLoginRequired(() => router.push('/login'));
        return;
      }
      router.push(path as never);
      return;
    }

    if (ADMISSION_REQUIRED_PATHS.has(path)) {
      const session = await resolveClientSession();
      if (session.isGuest) {
        alertLoginRequired(() => router.push('/login'));
        return;
      }
      if (!isUserAdmitted(session.user)) {
        alertPendingAdmission();
        return;
      }
    }

    if (PROTECTED_PATHS.has(path) && !getAuthToken()) {
      alertLoginRequired(() => router.push('/login'));
      return;
    }

    router.push(path as never);
  }

  return (
    <View style={styles.navContainer}>
      {navItems.map((item) => (
        <Pressable
          key={item.path}
          onPress={() => void onNavigate(item.path)}
          style={styles.navButton}
        >
          <ThemedText style={pathname === item.path ? styles.active : styles.inactive}>
            {item.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navButton: { padding: 5 },
  active: { color: '#F47B1F', fontWeight: 'bold', fontSize: 11 },
  inactive: { color: '#666', fontSize: 11 },
});
