import { useRouter } from 'expo-router';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenHeaderProps = {
  title?: string;
  /** Ruta si no hay historial para volver atrás */
  fallbackRoute?: string;
  right?: ReactNode;
  dark?: boolean;
};

export function ScreenHeader({
  title,
  fallbackRoute = '/home',
  right,
  dark = false,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackRoute as never);
  }

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + 8 },
        dark ? styles.barDark : styles.barLight,
      ]}
    >
      <Pressable onPress={goBack} style={[styles.backBtn, dark && styles.backBtnDark]} accessibilityLabel="Volver">
        <Text style={[styles.backText, dark && styles.backTextDark]}>←</Text>
      </Pressable>
      {title ? (
        <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  barLight: { backgroundColor: '#FFFFFF' },
  barDark: { backgroundColor: '#002855' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backText: { fontSize: 22, fontWeight: '700', color: '#002855' },
  backTextDark: { color: '#FFFFFF' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#002855',
    marginHorizontal: 8,
  },
  titleDark: { color: '#FFFFFF' },
  flex: { flex: 1 },
  spacer: { width: 40 },
});
