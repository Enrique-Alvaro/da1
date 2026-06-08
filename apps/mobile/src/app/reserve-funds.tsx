import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

const currencies = ['USD - Dólar Estadounidense', 'EUR - Euro', 'MXN - Peso Mexicano', 'ARS - Peso Argentino'];

export default function ReserveFundsScreen() {
  const router = useRouter();
  const [currency, setCurrency] = useState(currencies[0]);
  const [amount, setAmount] = useState('50000');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={{ width: '100%' }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Reservar Fondos</Text>
            <Text style={styles.subtitle}>
              Define el monto para participar en subastas.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Moneda</Text>
            <Pressable
              style={styles.selectBox}
              onPress={() => {
                const next = currencies[(currencies.indexOf(currency) + 1) % currencies.length];
                setCurrency(next);
              }}
            >
              <Text style={styles.inputText}>{currency}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </Pressable>

            <Text style={styles.label}>Monto a Reservar</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="50000"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.infoBox}> 
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>Nota: </Text>
              Puedes modificar el monto reservado en cualquier momento desde tu perfil.
            </Text>
          </View>

          <Pressable 
            style={styles.primaryButton} 
            onPress={() => router.push('/payment-method-verify')}
          >
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </Pressable>
          
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
    paddingTop: 32,
  },
  content: {
    width: '100%',
    paddingBottom: Spacing.six,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0A1E3F', // Azul marino oscuro
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280', // Gris
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1E3F',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // Borde gris claro
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  infoBox: {
    backgroundColor: '#F9FAFB', // Gris muy claro
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  infoText: {
    color: '#4B5563', // Gris oscuro
    fontSize: 14,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  primaryButton: {
    backgroundColor: '#E67E22', // Naranja
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});