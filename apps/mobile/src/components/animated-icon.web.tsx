import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

// En la web no necesitamos el overlay de la misma forma que en la app nativa, devolvemos null
export function AnimatedSplashOverlay() {
  return null;
}

// Versión simplificada y estática del ícono para la web, 
// sin 'react-native-reanimated' ni módulos CSS que rompan el empaquetador en SDK 54.
export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <View style={styles.background} />
      
      <View style={styles.imageContainer}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
    backgroundColor: '#ffffff', // Simulando el CSS estáticamente
    borderRadius: 32, // Un borde redondeado típico para estos íconos
  },
});