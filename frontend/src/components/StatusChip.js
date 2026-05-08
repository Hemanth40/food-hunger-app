import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppLayout } from '../utils/layout';

const CHIP_STYLES = {
  available: { bg: 'rgba(12, 143, 99, 0.2)', fg: '#34D3A3', icon: 'check-decagram-outline' },
  approved: { bg: 'rgba(41, 89, 209, 0.2)', fg: '#60A5FA', icon: 'progress-check' },
  claimed: { bg: 'rgba(210, 106, 28, 0.2)', fg: '#FB923C', icon: 'hand-coin-outline' },
  picked_up: { bg: 'rgba(166, 107, 0, 0.2)', fg: '#FBBF24', icon: 'truck-fast-outline' },
  delivered: { bg: 'rgba(19, 121, 91, 0.2)', fg: '#34D3A3', icon: 'map-marker-check-outline' },
  cancelled: { bg: 'rgba(199, 68, 68, 0.2)', fg: '#F87171', icon: 'close-octagon-outline' },
  expired: { bg: 'rgba(106, 98, 89, 0.2)', fg: '#9CA3AF', icon: 'clock-alert-outline' },
  driver: { bg: 'rgba(13, 116, 165, 0.2)', fg: '#38BDF8', icon: 'motorbike' },
  self: { bg: 'rgba(201, 95, 42, 0.2)', fg: '#FB923C', icon: 'storefront-outline' },
  flex: { bg: 'rgba(106, 72, 207, 0.2)', fg: '#A78BFA', icon: 'swap-horizontal-circle-outline' },
  ngo: { bg: 'rgba(19, 121, 91, 0.2)', fg: '#34D3A3', icon: 'home-city-outline' },
  neutral: { bg: 'rgba(255, 255, 255, 0.1)', fg: '#E2E8F0', icon: 'radiobox-blank' },
};

export default function StatusChip({ label, tone = 'neutral', style, icon }) {
  const layout = useAppLayout();
  const palette = CHIP_STYLES[tone] || CHIP_STYLES.neutral;

  return (
    <View
      style={[
        styles.chip,
        layout.isCompact && styles.chipCompact,
        { backgroundColor: palette.bg },
        style,
      ]}
    >
      <Icon name={icon || palette.icon} size={layout.isTiny ? 12 : 14} color={palette.fg} />
      <Text
        style={[
          styles.label,
          layout.isCompact && styles.labelCompact,
          { color: palette.fg },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  label: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  labelCompact: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
