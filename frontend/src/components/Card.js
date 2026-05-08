import React from 'react';
import { View, StyleSheet } from 'react-native';
import { C, R, shadow } from '../theme';

export default function Card({ children, style, pad = 16 }) {
  return (
    <View style={[styles.card, { padding: pad }, style]}>
      {children}
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
});
