import React from 'react';
import { View, StyleSheet } from 'react-native';
import { C, R, shadow } from '../theme';

// GlassCard is kept as a simple white card for backward compatibility
export default function GlassCard({ children, style, contentStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.divider,
    ...shadow,
  },
  inner: { padding: 16 },
});
