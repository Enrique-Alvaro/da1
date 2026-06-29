import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { fetchMyPurchases } from '@/services/api';
import type { PurchaseItem } from '@/services/types';

export default function MyPurchasesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyPurchases()
      .then((res) => setItems(res.items ?? []))
      .catch((e: { message?: string }) => setError(e?.message ?? 'Error al cargar compras.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Mis compras</Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#D35400" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Todavía no registrás compras adjudicadas.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <View key={item.registroId} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.productTitle ?? item.title ?? `Artículo #${item.itemId}`}
                </Text>
                <Text style={styles.row}>
                  Oferta ganadora: {item.currency} {item.finalAmount.toLocaleString('es-AR')}
                </Text>
                <Text style={styles.row}>
                  Comisión: {item.currency} {item.commissionAmount.toLocaleString('es-AR')}
                </Text>
                <Text style={styles.row}>
                  Envío: {item.currency} {item.shippingAmount.toLocaleString('es-AR')}
                </Text>
                <Text style={styles.total}>
                  Total: {item.currency} {item.totalAmount.toLocaleString('es-AR')}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#002855' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#002855',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  topBarTitle: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 17, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: '#DC2626', textAlign: 'center' },
  emptyText: { color: '#64748B', textAlign: 'center', fontSize: 15 },
  content: { padding: 20, paddingBottom: 35 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  row: { fontSize: 14, color: '#475569', marginBottom: 4 },
  total: { fontSize: 15, fontWeight: '700', color: '#D35400', marginTop: 8 },
});
