import { ThemedText } from '@/components/themed-text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

// Historial inicial simulado (Como en tu Figma)
const INITIAL_HISTORY = [
  { id: '1', user: 'user_789', amount: 1250, time: 'hace 2 minutos' },
  { id: '2', user: 'user_456', amount: 1200, time: 'hace 5 minutos' },
  { id: '3', user: 'user_123', amount: 1150, time: 'hace 8 minutos' },
  { id: '4', user: 'user_789', amount: 1100, time: 'hace 12 minutos' },
  { id: '5', user: 'user_234', amount: 1050, time: 'hace 18 minutos' },
  { id: '6', user: 'user_567', amount: 1000, time: 'hace 25 minutos' },
];

export default function BidHistoryScreen() {
  const router = useRouter();
  const { newBid } = useLocalSearchParams(); // Atrapamos el parámetro de la otra pantalla
  
  const [history, setHistory] = useState(INITIAL_HISTORY);

  // Efecto para insertar la puja nueva si existe
  useEffect(() => {
    if (newBid) {
      const myNewBid = {
        id: '0', 
        user: 'John Doe', 
        amount: Number(newBid), 
        time: 'Justo ahora'
      };
      setHistory([myNewBid, ...INITIAL_HISTORY]);
    }
  }, [newBid]);

  // El líder siempre será el primer elemento de la lista
  const currentLeader = history[0];

  const renderBidRow = ({ item, index }: { item: any, index: number }) => {
    const isWinner = index === 0;

    return (
      <View style={[styles.bidRow, isWinner && styles.winnerRow]}>
        <View style={styles.bidderInfo}>
          <View style={[styles.iconBox, isWinner ? styles.iconBoxWinner : styles.iconBoxNormal]}>
            <ThemedText style={[styles.trendIcon, isWinner ? styles.trendIconWinner : styles.trendIconNormal]}>
              {isWinner ? '↗' : '↘'}
            </ThemedText>
          </View>
          <View>
            <ThemedText style={styles.bidderName}>{item.user}</ThemedText>
            <ThemedText style={styles.bidTime}>{item.time}</ThemedText>
          </View>
        </View>
        <View style={styles.amountInfo}>
          <ThemedText style={[styles.bidAmount, isWinner && styles.bidAmountWinner]}>
            ${item.amount}
          </ThemedText>
          {isWinner && <ThemedText style={styles.ganandoText}>Ganando</ThemedText>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Cabecera superior */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </Pressable>
        <View>
          <ThemedText type="title" style={styles.title}>Historial de Pujas</ThemedText>
          <ThemedText style={styles.subtitle}>Artículo #3</ThemedText>
        </View>
      </View>

      {/* Banner del Líder Actual */}
      <View style={styles.leaderBanner}>
        <View>
          <ThemedText style={styles.leaderLabel}>Líder Actual</ThemedText>
          <ThemedText style={styles.leaderUser}>{currentLeader.user}</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText style={styles.leaderLabel}>Puja Más Alta</ThemedText>
          <ThemedText style={styles.leaderAmount}>${currentLeader.amount}</ThemedText>
        </View>
      </View>

      {/* Lista del Historial */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderBidRow}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  header: { flexDirection: 'row', padding: 20, paddingTop: 50, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'flex-start' },
  backButton: { marginRight: 15, marginTop: 5 },
  backIcon: { fontSize: 24, color: '#002855' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#002855' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 2 },

  leaderBanner: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FDF8ED', borderBottomWidth: 1, borderBottomColor: '#F0E6D2' },
  leaderLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  leaderUser: { fontSize: 20, fontWeight: 'bold', color: '#002855' },
  leaderAmount: { fontSize: 26, fontWeight: 'bold', color: '#D35400' },

  bidRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  winnerRow: { backgroundColor: '#FFFBE6' }, // Fondo amarillo claro
  
  bidderInfo: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconBoxWinner: { backgroundColor: '#FDE68A' },
  iconBoxNormal: { backgroundColor: '#E2E8F0' },
  trendIcon: { fontSize: 18, fontWeight: 'bold' },
  trendIconWinner: { color: '#92400E' },
  trendIconNormal: { color: '#64748B' },
  
  bidderName: { fontSize: 16, fontWeight: 'bold', color: '#002855' },
  bidTime: { fontSize: 13, color: '#888', marginTop: 2 },

  amountInfo: { alignItems: 'flex-end', justifyContent: 'center' },
  bidAmount: { fontSize: 18, fontWeight: 'bold', color: '#002855' },
  bidAmountWinner: { color: '#D35400' }, // Naranja
  ganandoText: { color: '#D35400', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
});