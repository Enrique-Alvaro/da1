import { ThemedText } from '@/components/themed-text';
import { useLocalSearchParams, useRouter } from 'expo-router'; // Agregamos useLocalSearchParams
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function ItemDetailScreen() {
  const router = useRouter();
  
  // Atrapamos los parámetros que vienen del catálogo
  const { id, title, initialBid, currentBid, desc, year } = useLocalSearchParams();

  // Valores por defecto por si alguien entra directo sin pasar por el catálogo
  const displayTitle = title || 'Artículo de Lujo';
  const displayInitial = initialBid || '0';
  const displayCurrent = currentBid || '0';
  const displayDesc = desc || 'Descripción no disponible.';
  const displayYear = year || 'N/A';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.imageContainer}>
          <Pressable style={styles.floatingBackButton} onPress={() => router.back()}>
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.bigIcon}>📦</ThemedText>
        </View>

        <View style={styles.contentContainer}>
          {/* Usamos los datos dinámicos */}
          <ThemedText type="title" style={styles.title}>{displayTitle}</ThemedText>
          <ThemedText style={styles.description}>{displayDesc}</ThemedText>

          <View style={styles.priceBox}>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Puja Inicial</ThemedText>
              <ThemedText style={styles.priceInitial}>${displayInitial}</ThemedText>
            </View>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Puja Actual</ThemedText>
              <ThemedText style={styles.priceCurrent}>${displayCurrent}</ThemedText>
            </View>
          </View>

          <ThemedText type="subtitle" style={styles.sectionTitle}>Detalles</ThemedText>
          
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Condición</ThemedText>
            <ThemedText style={styles.detailValue}>Excelente</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Año</ThemedText>
            <ThemedText style={styles.detailValue}>{displayYear}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Autenticidad</ThemedText>
            <ThemedText style={styles.authValue}>Verificado ✓</ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {/* Le pasamos los datos a la subasta en vivo */}
        <Pressable 
          style={styles.actionButton} 
          onPress={() => router.push({ 
            pathname: '/live-auction', 
            params: { id, title: displayTitle, currentBid: displayCurrent } 
          })}
        >
          <ThemedText style={styles.actionButtonText}>Entrar a subasta en vivo</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 100 }, // Espacio para el botón flotante
  
  // Imagen Superior
  imageContainer: { width: '100%', height: 320, backgroundColor: '#B0B5BE', justifyContent: 'center', alignItems: 'center' },
  bigIcon: { fontSize: 80, opacity: 0.8 },
  floatingBackButton: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  backIcon: { fontSize: 24, color: '#002855', fontWeight: 'bold' },

  // Contenido
  contentContainer: { padding: 20 },
  title: { fontSize: 26, color: '#002855', marginBottom: 10, fontWeight: 'bold' },
  description: { fontSize: 15, color: '#4A5568', lineHeight: 22, marginBottom: 20 },

  // Caja de Precios
  priceBox: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 20, marginBottom: 25 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  priceLabel: { fontSize: 15, color: '#666' },
  priceInitial: { fontSize: 22, fontWeight: 'bold', color: '#D35400' }, // Naranja
  priceCurrent: { fontSize: 22, fontWeight: 'bold', color: '#000000' }, // Negro

  // Detalles
  sectionTitle: { fontSize: 20, color: '#002855', marginBottom: 15, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  detailLabel: { fontSize: 15, color: '#666' },
  detailValue: { fontSize: 15, fontWeight: 'bold', color: '#002855' },
  authValue: { fontSize: 15, fontWeight: 'bold', color: '#27AE60' }, // Verde

  // Botón Inferior
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  actionButton: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});