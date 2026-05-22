import { CustomNavBar } from '@/components/CustomNavBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

export default function ExploreScreen() {
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    // Aquí iría tu lógica para traer las subastas de la API
    console.log("Cargando subastas destacadas...");
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* Encabezado Naranja */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>CrownBid</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Subastas Premium</ThemedText>
      </ThemedView>

      {/* Barra de navegación personalizada */}
      <CustomNavBar />

      <ThemedText type="subtitle" style={styles.sectionTitle}>Subastas Destacadas</ThemedText>

      {/* Lista de Subastas */}
      <FlatList
        data={auctions}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <ThemedText>{item.title}</ThemedText>
          </View>
        )}
        ListEmptyComponent={<ThemedText style={styles.empty}>No hay subastas destacadas por ahora.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#D35400', 
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  headerTitle: { color: '#FFF' },
  headerSubtitle: { color: '#FFF', opacity: 0.8 },
  sectionTitle: { padding: Spacing.four },
  card: { padding: Spacing.four, backgroundColor: '#FFF', marginHorizontal: Spacing.four, borderRadius: 10, marginBottom: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.five }
});