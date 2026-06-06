import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Datos simulados con la nueva paleta de colores (Modo Claro / Pastel)
const MOCK_PRODUCTS = [
  { 
    id: '1', 
    title: 'Rolex Submariner Vintage', 
    status: 'Scheduled', 
    statusIcon: '📅', 
    dateSent: '2026-04-10', 
    initialBid: '$5000', 
    auctionDate: '2026-04-20', 
    theme: { border: '#93C5FD', text: '#2563EB', bg: '#EFF6FF' } // Azul pastel
  },
  { 
    id: '2', 
    title: 'Pintura Abstracta de Artista Local', 
    status: 'Pending', 
    statusIcon: '🕒', 
    dateSent: '2026-04-08', 
    hasCancelBtn: true,
    theme: { border: '#FDE047', text: '#A16207', bg: '#FEF9C3' } // Amarillo pastel
  },
  { 
    id: '3', 
    title: 'Colección de Jarrones Antiguos', 
    status: 'Sold', 
    statusIcon: '$', 
    dateSent: '2026-04-05', 
    soldFor: '$3200', 
    theme: { border: '#D8B4FE', text: '#9333EA', bg: '#F3E8FF' } // Morado pastel
  },
  { 
    id: '4', 
    title: 'Reloj Dañado (No Auténtico)', 
    status: 'Rejected', 
    statusIcon: '⊗', 
    dateSent: '2026-04-03', 
    theme: { border: '#FCA5A5', text: '#DC2626', bg: '#FEE2E2' } // Rojo pastel
  },
  { 
    id: '5', 
    title: 'Collar de Diamantes', 
    status: 'Accepted', 
    statusIcon: '✓', 
    dateSent: '2026-04-12', 
    initialBid: '$8000', 
    hasCancelBtn: true,
    theme: { border: '#86EFAC', text: '#16A34A', bg: '#DCFCE7' } // Verde pastel
  }
];

export default function MisArticulosScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Productos</Text>
        <Text style={styles.subtitle}>Artículos enviados para subasta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Fila de Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, { color: '#000000' }]}>5</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Vendidos</Text>
            <Text style={[styles.statValue, { color: '#9333EA' }]}>1</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pendientes</Text>
            <Text style={[styles.statValue, { color: '#D97706' }]}>1</Text>
          </View>
        </View>

        {/* Lista de Productos */}
        {MOCK_PRODUCTS.map((item) => (
          <View 
            key={item.id} 
            style={[
              styles.productCard, 
              { borderColor: item.theme.border, backgroundColor: item.theme.bg }
            ]}
          >
            {/* Título y Estado */}
            <View style={styles.cardHeader}>
              <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.statusBadge}>
                <Text style={[styles.statusIcon, { color: item.theme.text }]}>{item.statusIcon}</Text>
                <Text style={[styles.statusText, { color: item.theme.text }]}>{item.status}</Text>
              </View>
            </View>

            {/* Detalles del Producto */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Enviado</Text>
                <Text style={styles.detailValueDark}>{item.dateSent}</Text>
              </View>

              {item.initialBid && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Puja Inicial</Text>
                  <Text style={styles.detailValueOrange}>{item.initialBid}</Text>
                </View>
              )}

              {item.auctionDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fecha de Subasta</Text>
                  <Text style={styles.detailValueDark}>{item.auctionDate}</Text>
                </View>
              )}

              {item.soldFor && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vendido Por</Text>
                  <Text style={[styles.detailValueDark, { color: '#9333EA' }]}>{item.soldFor}</Text>
                </View>
              )}
            </View>

            {/* Botón de Cancelar Publicación (Condicional) */}
            {item.hasCancelBtn && (
              <Pressable style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancelar Publicación</Text>
              </Pressable>
            )}
          </View>
        ))}

      </ScrollView>

      {/* Botón Flotante para Volver al Home */}
      <View style={styles.bottomBar}>
        <Pressable onPress={() => router.push('/home')} style={styles.backHomeButton}>
          <Text style={styles.backHomeText}>← Volver al Inicio</Text>
        </Pressable>
      </View>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, // Fondo blanco
  
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#002855', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666666' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  /* Estadísticas */
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 10, 
    padding: 15, 
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E6E9EB'
  },
  statLabel: { fontSize: 12, color: '#666666', marginBottom: 5 },
  statValue: { fontSize: 22, fontWeight: 'bold' },

  /* Tarjetas de Productos */
  productCard: { 
    borderRadius: 12, 
    borderWidth: 1.5, 
    padding: 20, 
    marginBottom: 15 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#002855', flex: 1, paddingRight: 10 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { fontSize: 14, marginRight: 5 },
  statusText: { fontSize: 14, fontWeight: 'bold' },

  detailsContainer: { gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#666666' },
  detailValueDark: { fontSize: 14, color: '#333333', fontWeight: 'bold' },
  detailValueOrange: { fontSize: 14, color: '#D35400', fontWeight: 'bold' }, // Naranja para el dinero

  /* Botón Cancelar */
  cancelButton: { 
    marginTop: 20, 
    backgroundColor: '#FFFFFF', // Fondo blanco para el botón
    borderWidth: 1, 
    borderColor: '#E74C3C', // Borde rojo
    borderRadius: 8, 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  cancelButtonText: { color: '#E74C3C', fontWeight: 'bold', fontSize: 14 },

  /* Barra inferior */
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFFFFF', padding: 20, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  backHomeButton: { alignItems: 'center' },
  backHomeText: { color: '#0066CC', fontSize: 16, fontWeight: 'bold' }
});