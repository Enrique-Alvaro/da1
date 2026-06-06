import { ThemedText } from '@/components/themed-text';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export function CustomNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Inicio', path: '/home' },
    { label: 'Mis Artículos', path: '/mis-articulos' },
    { label: 'Perfil', path: '/perfil' },
    { label: 'Vender', path: '/post-article' }, // Esto vincula directo al archivo que ya tenías
  ];

  return (
    <View style={styles.navContainer}>
      {navItems.map((item) => (
        <Pressable 
          key={item.path} 
          onPress={() => router.push(item.path as any)} 
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
  active: { color: '#F47B1F', fontWeight: 'bold', fontSize: 12 },
  inactive: { color: '#666', fontSize: 12 },
});