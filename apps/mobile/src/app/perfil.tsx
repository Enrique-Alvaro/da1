import { CustomNavBar } from '@/components/CustomNavBar';
import { getAuthToken, getCurrentUser, getMyMetrics, logout, updateProfile } from '@/services/api';
import type { UserMetrics, UserProfile } from '@/services/types';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_LABELS: Record<string, string> = {
  comun: 'Común', especial: 'Especial', plata: 'Plata', oro: 'Oro', platino: 'Platino',
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
        setError(e?.statusCode === 401 ? 'Debe iniciar sesión para acceder a esta sección.' : 'No se pudo cargar el perfil.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleLogout() {
    try { await logout(); } catch { }
    router.replace('/login');
  }

  const isAuthError = error?.includes('iniciar sesión');

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomNavBar />
        <View style={styles.centered}><ActivityIndicator size="large" color="#D35400" /></View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomNavBar />
        <View style={styles.centered}>
          {isAuthError ? (
            <>
              <Text style={styles.authGateIcon}>🔒</Text>
              <Text style={styles.authGateTitle}>Acceso restringido</Text>
              <Text style={styles.authGateText}>Debés iniciar sesión para acceder a esta sección.</Text>
              <Pressable style={styles.authGateButton} onPress={() => router.replace('/login')}>
                <Text style={styles.authGateButtonText}>Iniciar sesión</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.errorText}>{error ?? 'Error al cargar perfil.'}</Text>
              <Pressable onPress={() => router.replace('/login')} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomNavBar />
      <View style={styles.profileHeader}>
        <View style={styles.userInfoRow}>
          <View style={styles.avatar}><Text style={styles.avatarInitials}>{user.fullName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')}</Text></View>
          <View style={styles.userNameBlock}>
            <Text style={styles.userName}>{user.fullName}</Text>
            {user.admitted === 'si' && user.category ? (
              <View style={styles.badge}><Text style={styles.badgeIcon}>🔖</Text><Text style={styles.badgeText}>{CATEGORY_LABELS[user.category] ?? user.category}</Text></View>
            ) : (
              <View style={styles.badge}><Text style={styles.badgeText}>Pendiente de validación</Text></View>
            )}
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}><Text style={styles.statValue}>{metrics?.totalWins ?? 0}</Text><Text style={styles.statLabel}>Pujas Ganadas</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{metrics?.totalBidsPlaced ?? 0}</Text><Text style={styles.statLabel}>Total Pujas</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{metrics?.totalAuctionsAttended ?? 0}</Text><Text style={styles.statLabel}>Subastas</Text></View>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cardsContainer}>
        {user.admitted !== 'si' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              Tu cuenta está pendiente de validación. No podés gestionar medios de pago hasta ser aprobado.
            </Text>
          </View>
        )}
        {saveSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>Perfil actualizado correctamente.</Text>
          </View>
        )}
        {saveError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        )}
        {isEditing ? (
          <View style={styles.editFormCard}>
            <Text style={styles.formLabel}>Correo electrónico</Text>
            <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" />
            <Text style={styles.formLabel}>Dirección</Text>
            <TextInput style={styles.input} value={editAddress} onChangeText={setEditAddress} />
            <View style={styles.formButtons}>
              <Pressable
                style={styles.saveButton}
                disabled={isSaving}
                onPress={async () => {
                  setIsSaving(true);
                  setSaveError(null);
                  try {
                    await updateProfile({ email: editEmail, address: editAddress });
                    setUser({ ...user, email: editEmail, address: editAddress });
                    setSaveSuccess(true);
                    setIsEditing(false);
                  } catch (e: any) {
                    setSaveError(e?.message || 'No se pudo guardar el perfil.');
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                <Text style={styles.saveButtonText}>{isSaving ? 'Guardando…' : 'Guardar'}</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Pressable style={styles.card} onPress={() => setIsEditing(true)}>
              <View style={[styles.cardIconBox, { backgroundColor: '#E8F4FD' }]}>
                <Text style={styles.cardIcon}>✏️</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Datos personales</Text>
                <Text style={styles.cardSubtitle}>{user.email}</Text>
              </View>
            </Pressable>
            {user.admitted === 'si' ? (
              <Pressable style={styles.card} onPress={() => router.push('/payment-methods')}>
                <View style={[styles.cardIconBox, { backgroundColor: '#E8F8F0' }]}>
                  <Text style={styles.cardIcon}>💳</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Medios de pago</Text>
                  <Text style={styles.cardSubtitle}>Gestionar tarjetas y garantías</Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable style={[styles.card, styles.logoutCard]} onPress={handleLogout}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FDE8E8' }]}>
                <Text style={styles.cardIcon}>🚪</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: '#C0392B' }]}>Cerrar sesión</Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#E74C3C', fontSize: 16, textAlign: 'center', padding: 20 },
  profileHeader: { backgroundColor: '#D35400', padding: 20, paddingTop: 30, paddingBottom: 25 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  avatar: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarInitials: { fontSize: 28, fontWeight: 'bold', color: '#888' },
  userNameBlock: { flex: 1 },
  userName: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  badgeIcon: { fontSize: 12, marginRight: 4 },
  badgeText: { color: '#002855', fontWeight: 'bold', fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  statLabel: { fontSize: 13, color: '#FFF', opacity: 0.9, marginTop: 2 },
  cardsContainer: { padding: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E9EB', borderRadius: 12, padding: 15, marginBottom: 15, alignItems: 'center' },
  logoutCard: { borderColor: '#FADBD8', backgroundColor: '#FFFAFA' },
  cardIconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardIcon: { fontSize: 22 },
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#002855', marginBottom: 2 },
  cardSubtitle: { fontSize: 14, color: '#666' },
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
  authGateIcon: { fontSize: 48, marginBottom: 16 },
  authGateTitle: { fontSize: 20, fontWeight: 'bold', color: '#002855', marginBottom: 8 },
  authGateText: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  authGateButton: { backgroundColor: '#D35400', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
  authGateButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  retryBtn: { backgroundColor: '#D35400', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },
});