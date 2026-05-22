import { CustomNavBar } from '@/components/CustomNavBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

export default function PerfilScreen() {
  const router = useRouter();

  // Estados para controlar la edición y los datos del usuario
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState('john.doe@casino.com');
  const [address, setAddress] = useState('Av. Corrientes 1234, CABA');

  return (
    <ThemedView style={styles.container}>
      <CustomNavBar />
      
      {/* Cabecera del Perfil */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarPlaceholder} />
        <ThemedText type="title" style={styles.whiteText}>John Doe</ThemedText>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>Silver</ThemedText>
        </View>
        
        {/* Estadísticas */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText type="subtitle" style={styles.whiteText}>12</ThemedText>
            <ThemedText style={styles.whiteText}>Pujas Ganadas</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="subtitle" style={styles.whiteText}>45</ThemedText>
            <ThemedText style={styles.whiteText}>Total Pujas</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="subtitle" style={styles.whiteText}>8</ThemedText>
            <ThemedText style={styles.whiteText}>Activas</ThemedText>
          </View>
        </View>
      </View>

      {/* Opciones y Formulario de Edición */}
      <View style={styles.optionsList}>
        {isEditing ? (
          // Formulario que aparece solo cuando se presiona "Editar Perfil"
          <View style={styles.formContainer}>
            <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9AA0A6"
            />

            <ThemedText style={styles.label}>Dirección</ThemedText>
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholderTextColor="#9AA0A6"
            />

            <View style={styles.formButtons}>
              <Pressable style={styles.saveButton} onPress={() => setIsEditing(false)}>
                <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          // Botón normal de Editar Perfil cuando no se está editando
          <Pressable style={styles.option} onPress={() => setIsEditing(true)}>
            <ThemedText>Editar Perfil</ThemedText>
          </Pressable>
        )}
        
        {/* Botón de Métodos de Pago */}
        <Pressable style={styles.option} onPress={() => router.push('/payment-methods')}>
          <ThemedText>Métodos de Pago</ThemedText>
        </Pressable>
        
        {/* Botón Cerrar Sesión (Configuración fue eliminado de aquí) */}
        <Pressable style={[styles.option, { borderBottomWidth: 0 }]}>
          <ThemedText style={{ color: '#E74C3C' }}>Cerrar Sesión</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { padding: 20, alignItems: 'center', backgroundColor: '#D35400' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', marginBottom: 10 },
  badge: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 4, borderRadius: 15, marginBottom: 15 },
  badgeText: { color: '#D35400', fontWeight: 'bold', fontSize: 12 },
  whiteText: { color: '#FFF' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
  stat: { alignItems: 'center' },
  optionsList: { padding: 20 },
  option: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  
  // Estilos nuevos para el formulario de edición
  formContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#888',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E6E9EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    color: '#000',
    marginBottom: 15,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: '#F47B1F',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E6E9EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
  },
  cancelButtonText: {
    color: '#333',
  },
});