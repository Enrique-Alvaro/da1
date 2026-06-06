import { ThemedText } from '@/components/themed-text';
import { useLocalSearchParams, useRouter } from 'expo-router'; // Agregamos useLocalSearchParams
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function LiveAuctionScreen() {
  const router = useRouter();
  
  // Recibimos los datos del artículo
  const { id, title, currentBid } = useLocalSearchParams();
  
  const displayTitle = title || 'Artículo en Subasta';
  const baseBid = parseInt(currentBid as string) || 1250; // Convertimos el precio a número
  
  // Sugerimos un valor inicial un poco mayor a la puja actual
  const [bidAmount, setBidAmount] = useState((baseBid + 50).toString());

  const handleRealizarPuja = () => {
    const amount = parseInt(bidAmount);
    // Validamos dinámicamente contra el precio base del artículo seleccionado
    if (isNaN(amount) || amount <= baseBid) {
      Alert.alert('Puja inválida', `El monto debe ser mayor a la puja actual ($${baseBid}).`);
      return;
    }
    router.push({ pathname: '/bid-history', params: { newBid: amount } });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.liveBanner}>
          <View style={styles.liveHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={() => router.back()} style={{ paddingRight: 15 }}>
                <ThemedText style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>←</ThemedText>
              </Pressable>
              <ThemedText style={styles.liveTitle}>🔴 SUBASTA EN VIVO</ThemedText>
            </View>
            <ThemedText style={styles.viewersText}>👥 247</ThemedText>
          </View>
          <ThemedText style={styles.timerText}>🕒 Termina en 1h 23m</ThemedText>
        </View>

        <View style={styles.itemSummary}>
          <View style={styles.imagePlaceholder} />
          <View style={styles.itemInfo}>
            {/* Título dinámico */}
            <ThemedText style={styles.itemTitle}>{displayTitle}</ThemedText>
            <ThemedText style={styles.itemNumber}>Artículo #{id || '3'}</ThemedText>
          </View>
        </View>

        <View style={styles.highestBidBox}>
          <ThemedText style={styles.highestBidLabel}>Puja Más Alta Actual</ThemedText>
          <View style={styles.highestBidRow}>
            <ThemedText style={styles.trendIcon}>↗</ThemedText>
            {/* Precio dinámico */}
            <ThemedText style={styles.highestBidAmount}>${baseBid}</ThemedText>
          </View>
          <ThemedText style={styles.highestBidUser}>por user_789</ThemedText>
        </View>

        <View style={styles.bidSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Realiza tu Puja</ThemedText>
          
          <View style={styles.infoBox}>
            {/* Mostramos el rango sugerido dinámicamente */}
            <ThemedText style={styles.infoBoxText}>Rango sugerido: ${baseBid + 5} - ${baseBid + 150}</ThemedText>
            <ThemedText style={styles.infoBoxSubtext}>(±1%-20% del precio base)</ThemedText>
          </View>

          <ThemedText style={styles.inputLabel}>Monto de tu Puja</ThemedText>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.currencySymbol}>$</ThemedText>
            <TextInput 
              style={styles.textInput}
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
            />
          </View>
          <ThemedText style={styles.currentBidHelper}>Puja actual: ${baseBid}</ThemedText>
        </View>

      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.bidButton} onPress={handleRealizarPuja}>
          <ThemedText style={styles.bidButtonText}>Realizar Puja</ThemedText>
        </Pressable>
        <Pressable style={styles.historyLink} onPress={() => router.push('/bid-history')}>
          <ThemedText style={styles.historyLinkText}>Ver Historial de Pujas →</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 120 },
  liveBanner: { backgroundColor: '#C81010', padding: 20, paddingTop: 50 },
  liveHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  liveTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 },
  viewersText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  timerText: { color: '#FFF', fontSize: 14, opacity: 0.9 },
  itemSummary: { flexDirection: 'row', padding: 20, alignItems: 'center', backgroundColor: '#FFF' },
  imagePlaceholder: { width: 80, height: 80, backgroundColor: '#B0B5BE', borderRadius: 10, marginRight: 15 },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 20, fontWeight: 'bold', color: '#002855', marginBottom: 4 },
  itemNumber: { fontSize: 14, color: '#666' },
  highestBidBox: { backgroundColor: '#FDF8ED', paddingVertical: 25, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0E6D2' },
  highestBidLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  highestBidRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  trendIcon: { fontSize: 28, color: '#27AE60', marginRight: 10, fontWeight: 'bold' },
  highestBidAmount: { fontSize: 40, fontWeight: 'bold', color: '#002855' },
  highestBidUser: { fontSize: 14, color: '#D35400', fontWeight: '500' },
  bidSection: { padding: 20 },
  sectionTitle: { fontSize: 20, color: '#002855', marginBottom: 15, fontWeight: 'bold' },
  infoBox: { backgroundColor: '#F0F7FF', borderColor: '#B0D4FF', borderWidth: 1, borderRadius: 10, padding: 15, marginBottom: 20 },
  infoBoxText: { color: '#0066CC', fontSize: 14, marginBottom: 4 },
  infoBoxSubtext: { color: '#0066CC', fontSize: 12, opacity: 0.8 },
  inputLabel: { fontSize: 14, color: '#002855', fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D0D4DC', borderRadius: 10, paddingHorizontal: 15, backgroundColor: '#FFF' },
  currencySymbol: { fontSize: 18, color: '#666', marginRight: 10 },
  textInput: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#000', paddingVertical: 12 },
  currentBidHelper: { fontSize: 12, color: '#888', marginTop: 8 },
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#F8F9FA', borderTopWidth: 1, borderTopColor: '#EEEEEE', alignItems: 'center' },
  bidButton: { backgroundColor: '#D35400', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  bidButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  historyLink: { paddingBottom: 5 },
  historyLinkText: { color: '#0066CC', fontSize: 14, fontWeight: '500' },
});