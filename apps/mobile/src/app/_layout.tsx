import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthSessionGuard } from '@/components/AuthSessionGuard';
import { AuctionTickerProvider } from '@/contexts/AuctionTickerContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuctionTickerProvider>
        <AuthSessionGuard />
        <AnimatedSplashOverlay />
        <Slot />
      </AuctionTickerProvider>
    </ThemeProvider>
  );
}
