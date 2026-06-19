import { CustomNavBar } from '@/components/CustomNavBar';
import { getAuthToken, getCurrentUser, getMyMetrics, logout, updateProfile } from '@/services/api';
import type { UserMetrics, UserProfile } from '@/services/types';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_LABELS: Record<string, string> = {
  comun: 'Común',
  especial: 'Especial',
  plata: 'Plata',
  oro: 'Oro',
  platino: 'Platino',
};

export default function PerfilScreen() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!getAuthToken()) {
        setError('Debe iniciar sesión para acceder a esta sección.');
        setLoading(false);
        return;
      }

      try {
        const [u, m] = await Promise.all([getCurrentUser(), getMyMetrics()]);
        setUser(u);
        setMetrics(m);
        setEditEmail(u.email);
        setEditAddress(u.address ?? '');
      } catch (e: any) {
        if (e?.statusCode === 401) {
          setError('Debe iniciar sesión para acceder a esta sección.');
        } else {
          setError('No se pudo cargar el perfil.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore logout errors
    }
    router.replace('/login');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomNavBar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D35400" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomNavBar />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Error al cargar perfil.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomNavBar />

      {/* Cabecera Naranja */}
      <View style={styles.profileHeader}>
        {/* Fila de Usuario (Avatar y Nombre) */}
        <View style={styles.userInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <View style={styles.userNameBlock}>
            <Text style={styles.userName}>{user.fullName}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🔖</Text>
              <Text style={styles.badgeText}>{CATEGORY_LABELS[user.category] ?? user.category}</Text>
            </View>
          </View>
        </View>

        {/* Fila de Estadísticas */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{metrics?.totalWins ?? 0}</Text>
            <Text style={styles.statLabel}>Pujas Ganadas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{metrics?.totalBidsPlaced ?? 0}</Text>
            <Text style={styles.statLabel}>Total Pujas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{metrics?.totalAuctionsAttended ?? 0}</Text>
            <Text style={styles.statLabel}>Subastas</Text>
          </View>
        </View>
      </View>

      {/* Lista de Tarjetas (Cards) */}
      <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>

        {/* Banners de feedback del guardado */}
        {saveSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✓ Perfil actualizado correctamente.</Text>
          </View>
        )}

        {/* Lógica de Editar Perfil */}
        {isEditing ? (
          <View style={styles.editFormCard}>
            <Text style={styles.formLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={editAddress}
              onChangeText={setEditAddress}
            />

            {saveError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{saveError}</Text>
              </View>
            )}

            <View style={styles.formButtons}>
              <Pressable
                style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
                disabled={isSaving}
                onPress={async () => {
                  setIsSaving(true);
                  setSaveSuccess(false);
                  setSaveError(null);
                  try {
                    const updated = await updateProfile({
                      email: editEmail.trim(),
                      address: editAddress.trim() || null,
                    });
                    setUser(updated);
                    setIsEditing(false);
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 4000);
                  } catch (e: any) {
                    setSaveError(e?.message || 'No se pudo guardar el perfil.');
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.saveButtonText}>Guardar</Text>
                }
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => {
                setEditEmail(user.email);
                setEditAddress(user.address ?? '');
                setIsEditing(false);
              }}>
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
              <Text style={styles.cardSubtitle}>{user.email}</Text>
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
        <Pressable style={[styles.card, styles.logoutCard]} onPress={handleLogout}>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#E74C3C', fontSize: 16, textAlign: 'center', padding: 20 },

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
  logoutCard: { borderColor: '#FADBD8', backgroundColor: '#FFFAFA' },

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

  successBanner: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#6EE7B7', borderRadius: 10, padding: 14, marginBottom: 12 },
  successBannerText: { color: '#065F46', fontWeight: '600', fontSize: 14 },
  errorBanner: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorBannerText: { color: '#DC2626', fontSize: 14 },
});
