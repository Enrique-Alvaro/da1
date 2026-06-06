import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


//Email: john.doe@gmail.com
//Contraseña: password123



export default function LoginScreen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const HARDCODED_USER = {
    email: 'john.doe@gmail.com',
    password: 'password123'
  };

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Campos incompletos', 'Por favor, ingresá tu correo y contraseña.');
      return;
    }

    if (email.toLowerCase() === HARDCODED_USER.email && password === HARDCODED_USER.password) {
      router.push('/home');
    } else {
      Alert.alert('Error', 'El correo o la contraseña son incorrectos.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Bienvenido de Nuevo</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@gmail.com"
          placeholderTextColor="#9AA0A6"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#9AA0A6"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Entrar</Text>
        </Pressable>

        <Pressable style={styles.guestButton} onPress={() => router.push('/home?guest=true')}>
          <Text style={styles.guestButtonText}>Continuar como Invitado</Text>
        </Pressable>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.registerLink}>Regístrate</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 25, justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#002855', fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#666666', fontSize: 16 },
  
  form: { width: '100%' },
  label: { color: '#002855', fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#E6E9EB', backgroundColor: '#FFF', color: '#333', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 10, fontSize: 16, marginBottom: 20 },
  
  loginButton: { backgroundColor: '#D35400', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  guestButton: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E6E9EB', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 25 },
  guestButtonText: { color: '#002855', fontSize: 16, fontWeight: 'bold' },
  
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  registerText: { color: '#666', fontSize: 15 },
  registerLink: { color: '#D35400', fontSize: 15, fontWeight: 'bold' }
});