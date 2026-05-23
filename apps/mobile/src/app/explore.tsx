import { CustomNavBar } from '@/components/CustomNavBar';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router'; // Importamos el router
import React from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

// Base de datos simulada para la pestaña explorar
// Asignamos IDs específicos para mapearlos luego en catalog.tsx
const MOCK_ALL_AUCTIONS = [
  { id: '3', title: 'Set de Monedas Raras', category: 'Coleccionables', rank: 'Común', price: '$420', time: 'Termina en 1 día' },
  { id: '4', title: 'Cartera de Diseñador', category: 'Moda', rank: 'Común', price: '$680', time: 'Termina en 3 días' },
  { id: '5', title: 'Muebles Antiguos', category: 'Hogar', rank: 'Común', price: '$1500', time: 'Termina en 6 horas' },
];

export default function ExploreScreen() {
  const router = useRouter(); // Inicializamos el router

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Todas las Subastas</ThemedText>
        <View style={styles.searchContainer}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar subastas..."
            placeholderTextColor="#888"
          />
        </View>
      </View>

      <CustomNavBar />

<FlatList
        data={MOCK_ALL_AUCTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.card}
            onPress={() => {
              // Ahora cualquier catálogo de la lista pasa dinámicamente sus datos
              router.push({ 
                pathname: '/catalog', 
                params: { catalogId: item.id, catalogTitle: item.title, catalogTime: item.time } 
              });
            }}
          >
            <View style={styles.imagePlaceholder}>
              <ThemedText style={styles.icon}>📦</ThemedText>
            </View>
            <View style={styles.cardContent}>
              <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
              <View style={styles.categoryBadgeRow}>
                <ThemedText style={styles.cardCategory}>{item.category}</ThemedText>
                <View style={[styles.badge, { backgroundColor: '#E2E8F0' }]}>
                  <ThemedText style={[styles.badgeText, { color: '#475569' }]}>{item.rank}</ThemedText>
                </View>
              </View>
              
              <View style={styles.priceTimeRow}>
                <View>
                  <ThemedText style={styles.label}>Puja Actual</ThemedText>
                  <ThemedText style={styles.price}>{item.price}</ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={styles.label}>Estado</ThemedText>
                  <ThemedText style={styles.time}>{item.time.replace('Termina en ', '')}</ThemedText>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#FFF' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#002855', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 10, borderWidth: 1, borderColor: '#E6E9EB', paddingHorizontal: 15 },
  searchIcon: { fontSize: 18, marginRight: 10, opacity: 0.5 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  
  listContainer: { padding: 15, paddingBottom: 30 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E9EB', padding: 15, marginBottom: 15 },
  imagePlaceholder: { width: 80, height: 80, backgroundColor: '#D0D4DC', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  icon: { fontSize: 30 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#002855' },
  categoryBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 10, gap: 10 },
  cardCategory: { fontSize: 14, color: '#666' },
  
  // Estilos para el badge de rango
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },

  priceTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#888' },
  price: { fontSize: 18, fontWeight: 'bold', color: '#D35400' },
  time: { fontSize: 14, fontWeight: 'bold', color: '#002855' },
});