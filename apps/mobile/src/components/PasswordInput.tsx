import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

type PasswordInputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

export function PasswordInput({ style, containerStyle, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        style={[styles.input, style]}
        placeholderTextColor={props.placeholderTextColor ?? '#9AA0A6'}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        hitSlop={8}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={22}
          color="#6B7280"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 0,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
});
