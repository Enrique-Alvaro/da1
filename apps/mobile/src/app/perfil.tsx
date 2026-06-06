import { CustomNavBar } from '@/components/CustomNavBar';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PerfilScreen() {
  const router = useRouter();

  // Estados para la edición de perfil
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState('john.doe@gmail.com');
  const [address, setAddress] = useState('Av. Corrientes 1234');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Cabecera Naranja */}
      <View style={styles.profileHeader}>
        {/* Fila de Usuario (Avatar y Nombre) */}
        <View style={styles.userInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <View style={styles.userNameBlock}>
            <Text style={styles.userName}>John Doe</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🔖</Text>
              <Text style={styles.badgeText}>Silver</Text>
            </View>
          </View>
        </View>

        {/* Fila de Estadísticas */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Pujas Ganadas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Total Pujas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Activas</Text>
          </View>
        </View>
      </View>

      {/* Barra de navegación */}
      <CustomNavBar />

      {/* Lista de Tarjetas (Cards) */}
      <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        
        {/* Lógica de Editar Perfil */}
        {isEditing ? (
          <View style={styles.editFormCard}>
            <Text style={styles.formLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={styles.formLabel}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
            />
            
            <View style={styles.formButtons}>
              <Pressable style={styles.saveButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.card} onPress={() => setIsEditing(true)}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EBF5FF' }]}>
              <Text style={[styles.cardIcon, { color: '#0066CC' }]}>👤</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Editar Perfil</Text>
              <Text style={styles.cardSubtitle}>Actualiza tu información</Text>
            </View>
          </Pressable>
        )}

        {/* Métodos de Pago */}
        <Pressable style={styles.card} onPress={() => router.push('/payment-methods')}>
          <View style={[styles.cardIconBox, { backgroundColor: '#E9F7EF' }]}>
            <Text style={[styles.cardIcon, { color: '#27AE60' }]}>💳</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Métodos de Pago</Text>
            <Text style={styles.cardSubtitle}>Administra tus tarjetas</Text>
          </View>
        </Pressable>

{/* Notificaciones */}
        <Pressable style={styles.card} onPress={() => router.push('/notifications')}>
          <View style={[styles.cardIconBox, { backgroundColor: '#FEF5E7' }]}>
            <Text style={[styles.cardIcon, { color: '#F39C12' }]}>🔔</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Notificaciones</Text>
            <Text style={styles.cardSubtitle}>Ver actualizaciones de subastas</Text>
          </View>
        </Pressable>

        {/* Cerrar Sesión */}
        <Pressable style={[styles.card, styles.logoutCard]} onPress={() => router.replace('/login')}>
          <View style={[styles.cardIconBox, { backgroundColor: '#FDEDEC' }]}>
            <Text style={[styles.cardIcon, { color: '#E74C3C' }]}>🚪</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: '#E74C3C' }]}>Cerrar Sesión</Text>
            <Text style={[styles.cardSubtitle, { color: '#E74C3C', opacity: 0.8 }]}>Salir de tu cuenta</Text>
          </View>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  /* Cabecera */
  profileHeader: { backgroundColor: '#D35400', padding: 20, paddingTop: 30, paddingBottom: 25 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  
  avatar: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarIcon: { fontSize: 40, color: '#D35400' },
  
  userNameBlock: { flex: 1 },
  userName: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  badgeIcon: { fontSize: 12, marginRight: 4 },
  badgeText: { color: '#002855', fontWeight: 'bold', fontSize: 14 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  statLabel: { fontSize: 13, color: '#FFF', opacity: 0.9, marginTop: 2 },

  /* Contenedor de Tarjetas */
  cardsContainer: { padding: 20, paddingBottom: 40 },
  
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E9EB', borderRadius: 12, padding: 15, marginBottom: 15, alignItems: 'center' },
  logoutCard: { borderColor: '#FADBD8', backgroundColor: '#FFFAFA' }, // Sutil fondo rojizo para salir
  
  cardIconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardIcon: { fontSize: 22 },
  
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#002855', marginBottom: 2 },
  cardSubtitle: { fontSize: 14, color: '#666' },

  /* Formulario de Edición (Card Expandida) */
  editFormCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#0066CC', borderRadius: 12, padding: 20, marginBottom: 15 },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#002855', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E6E9EB', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, fontSize: 15, color: '#333', marginBottom: 15, backgroundColor: '#F8F9FA' },
  formButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  saveButton: { backgroundColor: '#D35400', paddingVertical: 12, borderRadius: 8, flex: 1, marginRight: 10, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  cancelButton: { backgroundColor: '#F0F0F0', paddingVertical: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  cancelButtonText: { color: '#333', fontWeight: 'bold', fontSize: 15 },
});