import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// Actualizamos las opciones para incluir el nombre del ícono y su color de fondo
const options = [
  {
    id: 'bank',
    title: 'Cuenta Bancaria',
    description: 'Reserva fondos desde tu cuenta',
    iconName: 'business-outline' as const,
    iconBg: '#7C3AED', // Morado
    route: '/add-bank-account',
  },
  {
    id: 'card',
    title: 'Tarjeta de Crédito',
    description: 'Nacional o internacional',
    iconName: 'card-outline' as const,
    iconBg: '#2563EB', // Azul
    route: '/add-payment-card',
  },
  {
    id: 'check',
    title: 'Cheque Certificado',
    description: 'Entregado antes de la subasta',
    iconName: 'document-text-outline' as const,
    iconBg: '#059669', // Verde
    route: '/add-certified-check',
  },
];

export default function SelectPaymentMethodScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={{ width: '100%' }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Selecciona Método de Pago</Text>
            <Text style={styles.subtitle}>
              Elige cómo deseas garantizar tu participación
            </Text>
          </View>

          {options.map((option) => (
            <Pressable
              key={option.id}
              style={styles.optionCard}
              onPress={() => router.push(option.route as any)}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.iconBox, { backgroundColor: option.iconBg }]}>
                  <Ionicons name={option.iconName} size={28} color="#FFFFFF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </Pressable>
          ))}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>Importante: </Text>
              Todos los métodos de pago deben ser verificados antes de participar en subastas.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 24,
  },
  content: {
    width: '100%',
    paddingBottom: Spacing.six,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0A1E3F', // Azul marino oscuro
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280', // Gris
    textAlign: 'center',
  },
  optionCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB', // Borde gris sutil
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1E3F', // Azul marino oscuro
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280', // Gris
  },
  infoBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE', // Borde azul claro
    backgroundColor: '#EFF6FF', // Fondo azul muy claro
    padding: 16,
    marginTop: 16,
  },
  infoText: {
    color: '#1E40AF', // Azul oscuro para lectura
    fontSize: 14,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: 'bold',
  },
});