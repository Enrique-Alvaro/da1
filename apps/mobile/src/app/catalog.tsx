import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const CATALOG_DATA = {
  '1': { // Relojes (Figma Inicio)
    category: 'Especial', location: 'Nueva York, NY', auctioneer: "Christie's International", currency: 'USD',
    items: [
      { id: '101', title: 'Rolex Submariner Vintage', initialBid: '500', currentBid: '1250', desc: 'Un Rolex Submariner de los años 60 en excelente condición.', year: '1965' },
      { id: '102', title: 'Omega Speedmaster Professional', initialBid: '350', currentBid: '850', desc: 'El legendario Moonwatch original. Cronógrafo de cuerda manual.', year: '1970' },
      { id: '103', title: 'TAG Heuer Carrera', initialBid: '400', currentBid: '600', desc: 'Reloj icónico de carreras con movimiento automático.', year: '1985' }
    ]
  },
  '2': { // Obras de Arte (Figma Inicio)
    category: 'Especial', location: 'París, Francia', auctioneer: "Sotheby's", currency: 'EUR',
    items: [
      { id: '201', title: 'Pintura Abstracta "Amanecer"', initialBid: '1500', currentBid: '3200', desc: 'Óleo sobre lienzo de un reconocido artista contemporáneo europeo.', year: '2018' },
      { id: '202', title: 'Escultura de Bronce Minimalista', initialBid: '800', currentBid: '1150', desc: 'Escultura abstracta en bronce macizo, edición limitada.', year: '2020' },
      { id: '203', title: 'Fotografía Vintage Firmada', initialBid: '300', currentBid: '450', desc: 'Impresión original en gelatina de plata de los años 50.', year: '1955' }
    ]
  },
  '3': { // Coleccionables - Monedas Raras (Figma Explorar)
    category: 'Común', location: 'Madrid, España', auctioneer: "Aureo & Calicó", currency: 'USD',
    items: [
      { id: '301', title: 'Doblón de Oro Español 1750', initialBid: '1000', currentBid: '2500', desc: 'Rara moneda de 8 escudos acuñada bajo el reinado de Fernando VI.', year: '1750' },
      { id: '302', title: 'Denario Romano Julio César', initialBid: '200', currentBid: '420', desc: 'Denario de plata conmemorativo con el retrato de Julio César.', year: '44 aC' },
      { id: '303', title: 'Set Proof Centenarios México', initialBid: '500', currentBid: '800', desc: 'Set completo de monedas de centenario de oro mexicanas en acabado espejo.', year: '2010' }
    ]
  },
  '4': { 
    category: 'Común', location: 'Milán, Italia', auctioneer: "Finarte Auctions", currency: 'USD',
    items: [
      { id: '401', title: 'Hermès Birkin 35 Togo', initialBid: '5000', currentBid: '8500', desc: 'Icónica cartera Hermès Birkin en cuero Togo color Gold con herrajes dorados. Incluye candado, llaves y dustbag original.', year: '2015' },
      { id: '402', title: 'Chanel Classic Double Flap', initialBid: '3000', currentBid: '4800', desc: 'Bolso clásico acolchado Chanel en piel de cordero negra. Cadena entrelazada con cuero y logo CC característico.', year: '2019' },
      { id: '403', title: 'Louis Vuitton Speedy 30 Vintage', initialBid: '400', currentBid: '680', desc: 'Modelo clásico Speedy con lona Monogram original. Mangos de cuero vachetta con una hermosa pátina natural.', year: '1992' }
    ]
  },
  '5': { 
    category: 'Común', location: 'Londres, Reino Unido', auctioneer: "Bonhams", currency: 'USD',
    items: [
      { id: '501', title: 'Escritorio Bureau Cisterciense', initialBid: '2000', currentBid: '4500', desc: 'Magnífico escritorio de caída en madera de nogal maciza con incrustaciones de madera frutal y cajones secretos.', year: '1780' },
      { id: '502', title: 'Par de Sillones Luis XV', initialBid: '1000', currentBid: '1500', desc: 'Sillones de época tallados a mano en madera dorada y tapizados en seda damasquina floral francesa. Estructura firme.', year: '1750' },
      { id: '503', title: 'Reloj de Pie George III', initialBid: '900', currentBid: '1300', desc: 'Reloj de caja alta en madera de caoba con esfera de latón grabada y fases lunares funcionales. Mecanismo de 8 días.', year: '1795' }
    ]
  }
};

export default function CatalogScreen() {
  const router = useRouter();
  // Atrapamos qué catálogo eligió el usuario en el home
  const { catalogId, catalogTitle, catalogTime } = useLocalSearchParams();

  // Elegimos los datos correspondientes (si no encuentra el ID, por defecto muestra el 1)
  const currentCatalog = CATALOG_DATA[catalogId as keyof typeof CATALOG_DATA] || CATALOG_DATA['1'];
  const displayTitle = catalogTitle || 'Subasta Destacada';
  const displayTime = catalogTime || 'Próximamente';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.topBarIcon}>←</ThemedText>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText style={styles.topBarTitle}>CrownBid</ThemedText>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Título Dinámico */}
        <ThemedText type="title" style={styles.title}>{displayTitle}</ThemedText>
        
        <View style={styles.statusRow}>
          <ThemedText style={styles.statusText}>🕒 Inicia: {displayTime}</ThemedText>
          <View style={styles.badgeProximamente}>
            <ThemedText style={styles.badgeTextProximamente}>Activo</ThemedText>
          </View>
        </View>

        <View style={styles.orangeBanner}>
          <ThemedText style={styles.bannerSubtitle}>La subasta finaliza en</ThemedText>
          {/* Sacamos el texto que le pasamos para que se vea más limpio */}
          <ThemedText style={styles.bannerTitle}>{displayTime.toString().replace('Termina en ', '')}</ThemedText>
          <ThemedText style={styles.bannerDate}>¡Participá ahora!</ThemedText>
        </View>

        {/* Info Dinámica */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoLabel}>🏷️ Categoría</ThemedText>
            <ThemedText style={styles.infoValue}>{currentCatalog.category}</ThemedText>
          </View>
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoLabel}>💲 Moneda</ThemedText>
            <ThemedText style={styles.infoValue}>{currentCatalog.currency}</ThemedText>
          </View>
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoLabel}>👤 Subastador</ThemedText>
            <ThemedText style={styles.infoValue}>{currentCatalog.auctioneer}</ThemedText>
          </View>
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoLabel}>📍 Ubicación</ThemedText>
            <ThemedText style={styles.infoValue}>{currentCatalog.location}</ThemedText>
          </View>
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>Artículos en Subasta</ThemedText>

        {/* Generamos la lista automáticamente usando map() */}
        {currentCatalog.items.map((item) => (
          <Pressable 
            key={item.id}
            style={styles.articleCard} 
            onPress={() => router.push({ 
              pathname: '/item-detail', 
              // Le pasamos toda la info del ítem específico a la siguiente pantalla
              params: { id: item.id, title: item.title, initialBid: item.initialBid, currentBid: item.currentBid, desc: item.desc, year: item.year } 
            })}
          >
            <View style={styles.articleIconBox}>
              <ThemedText style={styles.articleIcon}>📦</ThemedText>
            </View>
            <View style={styles.articleContent}>
              <ThemedText style={styles.articleTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.articleLabel}>Puja Actual</ThemedText>
              <ThemedText style={styles.articlePrice}>${item.currentBid}</ThemedText>
            </View>
            <View style={styles.articleAction}>
              <ThemedText style={styles.linkVer}>Ver →</ThemedText>
            </View>
          </Pressable>
        ))}

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, paddingTop: 40, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 5, width: 40 },
  topBarTitle: { fontWeight: 'bold', fontSize: 16, color: '#002855' },
  topBarIcon: { fontSize: 22, color: '#002855' },
  placeholder: { width: 40 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, color: '#002855', marginBottom: 10, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusText: { fontSize: 14, color: '#666' },
  badgeProximamente: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeTextProximamente: { color: '#0369A1', fontWeight: 'bold', fontSize: 12 },
  orangeBanner: { backgroundColor: '#FF7A00', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 25 },
  bannerSubtitle: { color: '#FFF', fontSize: 14, fontWeight: '500', marginBottom: 5 },
  bannerTitle: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  bannerDate: { color: '#FFF', fontSize: 14, opacity: 0.9, fontWeight: 'bold' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  infoCard: { width: '48%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E9EB', borderRadius: 12, padding: 15, marginBottom: 15 },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 8 },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#002855' },
  sectionTitle: { fontSize: 20, color: '#002855', marginBottom: 15, fontWeight: 'bold' },
  articleCard: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E9EB', borderRadius: 12, padding: 15, marginBottom: 15, alignItems: 'center' },
  articleIconBox: { width: 60, height: 60, backgroundColor: '#D0D4DC', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  articleIcon: { fontSize: 24 },
  articleContent: { flex: 1 },
  articleTitle: { fontSize: 16, fontWeight: 'bold', color: '#002855', marginBottom: 4 },
  articleLabel: { fontSize: 12, color: '#888' },
  articlePrice: { fontSize: 16, fontWeight: 'bold', color: '#D35400', marginTop: 2 },
  articleAction: { paddingLeft: 10 },
  linkVer: { color: '#0066CC', fontSize: 14, fontWeight: '500' },
});