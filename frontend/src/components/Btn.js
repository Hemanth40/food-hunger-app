import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { C, R, F } from '../theme';

export default function Btn({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  full = true,
}) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        variant === 'ghost' && styles.ghost,
        !full && styles.auto,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : C.brand} size="small" />
      ) : (
        <Text style={[styles.label, !isPrimary && styles.labelDark]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: C.brand,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.brand,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  auto: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: F.md,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  labelDark: {
    color: C.brand,
  },
});
