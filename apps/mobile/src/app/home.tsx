import { CustomNavBar } from '@/components/CustomNavBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams, useRouter } from 'expo-router'; // Agregamos useLocalSearchParams
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

const RANK_LEVELS: Record<string, number> = {
  'Común': 0, 'Especial': 1, 'Plata': 2, 'Oro': 3, 'Platino': 4,
};

const MOCK_DESTACADAS = [
  { id: '1', title: 'Colección de Relojes Vintage', rank: 'Común', time: 'Termina en 2 días', isCatalog: true }, // Cambiado a Common para coincidir con tu imagen
  { id: '2', title: 'Obra de Arte Moderna', rank: 'Especial', time: 'Termina en 5 horas', isCatalog: true },
  { id: '6', title: 'Joyería de Diamantes', rank: 'Oro', time: 'Termina en 3 días', isCatalog: false },
  { id: '7', title: 'Auto Deportivo Exclusivo', rank: 'Platino', time: 'Termina en 12 horas', isCatalog: false },
];

export default function HomeScreen() {
  const router = useRouter();
  const { guest } = useLocalSearchParams(); // Atrapamos el parámetro del Login
  const [auctions] = useState(MOCK_DESTACADAS);

  const isGuest = guest === 'true';

  // Si es invitado, le damos nivel -1 para que TODO se bloquee. Si no, es John Doe nivel Plata.
  const currentUser = isGuest 
    ? { name: 'Invitado', rank: 'Ninguna', rankLevel: -1 }
    : { name: 'John Doe', rank: 'Plata', rankLevel: RANK_LEVELS['Plata'] };

  const getBadgeStyle = (rank: string) => {
    switch(rank) {
      case 'Común': return { bg: '#FFF3CD', text: '#856404' }; // Estilo amarillo claro para Common en tu imagen
      case 'Especial': return { bg: '#FFF3CD', text: '#856404' };
      case 'Plata': return { bg: '#E2E3E5', text: '#383D41' };
      case 'Oro': return { bg: '#FDF1EC', text: '#D35400' };
      case 'Platino': return { bg: '#E0F2FE', text: '#0369A1' };
      default: return { bg: '#EEE', text: '#333' };
    }
  };

  const renderAuctionCard = ({ item }: { item: typeof MOCK_DESTACADAS[0] }) => {
    const isLocked = RANK_LEVELS[item.rank] > currentUser.rankLevel;
    const badgeStyle = getBadgeStyle(item.rank);

    return (
      <Pressable 
        style={styles.card}
        onPress={() => {
          if (isGuest) {
            router.push('/login'); // Si es invitado y toca la tarjeta, lo manda a loguearse
          } else if (!isLocked && item.isCatalog) {
            router.push({ pathname: '/catalog', params: { catalogId: item.id, catalogTitle: item.title, catalogTime: item.time } });
          } else if (!isLocked) {
            router.push('/item-detail');
          }
        }}
      >
        <View style={styles.imagePlaceholder}>
          <ThemedText style={styles.icon}>{isLocked ? '🔒' : '📦'}</ThemedText>
        </View>

        <View style={styles.cardContent}>
          <ThemedText type="default" style={styles.title}>{item.title}</ThemedText>
          
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <ThemedText style={[styles.badgeText, { color: badgeStyle.text }]}>{item.rank === 'Común' ? 'Common' : item.rank}</ThemedText>
          </View>
          
          <View style={styles.footerRow}>
            <ThemedText style={[styles.time, isLocked && isGuest ? { color: '#888' } : {}]}>{item.time}</ThemedText>
            {!isLocked && <ThemedText style={styles.linkVer}>Ver →</ThemedText>}
          </View>

          {isLocked && (
            <ThemedText style={styles.warningText}>
              {isGuest ? '🔒 Inicia sesión para ver esta subasta' : '⚠️ Tu nivel de categoría no permite participar en esta subasta'}
            </ThemedText>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton}>
          <ThemedText style={styles.topBarIcon}>←</ThemedText>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText style={styles.topBarTitle}>CrownBid</ThemedText>
        </View>
        <Pressable style={styles.iconButton} onPress={() => router.replace('/login')}>
          <ThemedText style={styles.topBarIcon}>[→ </ThemedText>
        </Pressable>
      </View>

      {/* Banner Dinámico (Invitado vs Usuario) */}
      <View style={styles.userBanner}>
        {isGuest ? (
          <>
            <View style={styles.guestBannerHeader}>
              <View>
                <ThemedText type="title" style={styles.greeting}>Bienvenido</ThemedText>
                <ThemedText style={styles.userRank}>Subastas Premium</ThemedText>
              </View>
              <Pressable style={styles.entrarButton} onPress={() => router.replace('/login')}>
                <ThemedText style={styles.entrarButtonText}>→ Entrar</ThemedText>
              </Pressable>
            </View>
            <View style={styles.guestAlertBox}>
              <ThemedText style={styles.guestAlertText}>
                👋 Navegando como invitado. ¡Inicia sesión para ver precios y pujar!
              </ThemedText>
            </View>
          </>
        ) : (
          <>
            <ThemedText type="title" style={styles.greeting}>Hola, {currentUser.name}</ThemedText>
            <ThemedText style={styles.userRank}>Categoría: {currentUser.rank}</ThemedText>
          </>
        )}
      </View>

      <CustomNavBar />

      <ThemedText type="subtitle" style={styles.sectionTitle}>Subastas Destacadas</ThemedText>

      <FlatList
        data={auctions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderAuctionCard}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, paddingTop: 40, backgroundColor: '#FFF', alignItems: 'center' },
  topBarTitle: { fontWeight: 'bold', fontSize: 16, color: '#002855' },
  topBarIcon: { fontSize: 20, color: '#002855' },
  iconButton: { padding: 5, width: 40, alignItems: 'center' },
  
  userBanner: { backgroundColor: '#D35400', padding: 20, paddingBottom: 30 },
  greeting: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  userRank: { color: '#FFF', fontSize: 16, marginTop: 4, opacity: 0.9 },
  
  // Estilos nuevos para el modo Invitado
  guestBannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entrarButton: { backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  entrarButtonText: { color: '#D35400', fontWeight: 'bold', fontSize: 14 },
  guestAlertBox: { backgroundColor: '#A04000', padding: 12, borderRadius: 8, marginTop: 15 },
  guestAlertText: { color: '#FFF', fontSize: 14, fontWeight: '500' },

  sectionTitle: { fontSize: 20, color: '#002855', paddingHorizontal: 15, paddingTop: 20, fontWeight: 'bold' },
  listContainer: { padding: 15, paddingBottom: 30 },
  
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E9EB', padding: 15, marginBottom: 15 },
  imagePlaceholder: { width: 80, height: 80, backgroundColor: '#D0D4DC', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  icon: { fontSize: 30 },
  cardContent: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 18, color: '#002855', marginBottom: 5, fontWeight: 'bold' },
  
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 14, color: '#D35400', fontWeight: '500' },
  linkVer: { fontSize: 14, color: '#666' },
  
  warningText: { fontSize: 12, color: '#E74C3C', marginTop: 10, fontWeight: '600', lineHeight: 18 },
});