import React from 'react';
import { View, TextInput as RNInput, Text, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { C, R, F } from '../theme';

export default function Field({
  label,
  icon,
  error,
  style,
  ...rest
}) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, error && styles.boxError]}>
        {icon ? <Icon name={icon} size={20} color={C.grey2} style={styles.icon} /> : null}
        <RNInput
          style={styles.input}
          placeholderTextColor={C.grey3}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: F.sm,
    fontWeight: '600',
    color: C.grey1,
    marginBottom: 6,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.md,
    paddingHorizontal: 12,
    height: 50,
  },
  boxError: {
    borderColor: C.brand,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: F.md,
    color: C.black,
    height: '100%',
  },
  error: {
    marginTop: 4,
    fontSize: F.xs,
    color: C.brand,
    fontWeight: '600',
  },
});
