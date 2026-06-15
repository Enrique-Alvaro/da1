import { ThemedText } from '@/components/themed-text';
import { getAuthToken } from '@/services/api';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

const PROTECTED_PATHS = new Set(['/mis-articulos', '/perfil', '/post-article', '/payment-methods']);

export function CustomNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Inicio', path: '/home' },
    { label: 'Mis Artículos', path: '/mis-articulos' },
    { label: 'Perfil', path: '/perfil' },
    { label: 'Vender', path: '/post-article' },
  ];

  function onNavigate(path: string) {
    if (PROTECTED_PATHS.has(path) && !getAuthToken()) {
      Alert.alert(
        'Inicio de sesión requerido',
        'Debes iniciar sesión para acceder a esta sección.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ]
      );
      return;
    }
    router.push(path as never);
  }

  return (
    <View style={styles.navContainer}>
      {navItems.map((item) => (
        <Pressable
          key={item.path}
          onPress={() => onNavigate(item.path)}
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
