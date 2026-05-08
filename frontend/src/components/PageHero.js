import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import GlassCard from './GlassCard';
import StatusChip from './StatusChip';
import { useAppLayout } from '../utils/layout';

const HERO_TONES = {
  warm: ['#1E1624', '#3E254A'], // Deep Magenta/Purple vibe
  teal: ['#042F2E', '#115E59'], // Deep Teal
  ember: ['#2F1212', '#7F1D1D'], // Deep Crimson
};

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  icon = 'sparkles',
  tone = 'warm',
  statusLabel,
  statusTone = 'neutral',
  stats = [],
  action,
  style,
}) {
  const layout = useAppLayout();
  const colors = HERO_TONES[tone] || HERO_TONES.warm;

  return (
    <GlassCard style={style} accent="dark" contentStyle={styles.cardContent}>
      <LinearGradient
        colors={colors}
        style={[styles.hero, layout.isCompact && styles.heroCompact, layout.isTiny && styles.heroTiny]}
      >
        <View style={[styles.heroRow, layout.isWide && styles.heroRowWide]}>
          <View style={styles.copy}>
            <View style={[styles.topLine, layout.isCompact && styles.topLineCompact]}>
              <View style={[styles.iconBadge, layout.isCompact && styles.iconBadgeCompact]}>
                <Icon name={icon} size={20} color="#FFF6EF" />
              </View>
              {statusLabel ? <StatusChip tone={statusTone} label={statusLabel} style={styles.statusChip} /> : null}
            </View>

            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text
              style={[
                styles.title,
                { fontSize: layout.heroTitleSize, lineHeight: Math.round(layout.heroTitleSize * 1.1) },
              ]}
            >
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.side}>
            {stats.length ? (
              <View style={[styles.stats, layout.isWide && styles.statsWide]}>
                {stats.map((item) => (
                  <View
                    key={`${item.label}-${item.value}`}
                    style={[
                      styles.statTile,
                      layout.isCompact && styles.statTileCompact,
                      layout.isTiny && styles.statTileTiny,
                    ]}
                  >
                    <View style={[styles.statIcon, layout.isCompact && styles.statIconCompact]}>
                      <Icon name={item.icon || 'chart-box-outline'} size={16} color="#0F1720" />
                    </View>
                    <Text style={styles.statValue}>{item.value}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {action ? <View style={styles.actionWrap}>{action}</View> : null}
          </View>
        </View>
      </LinearGradient>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 0,
  },
  hero: {
    padding: 22,
    borderRadius: 32,
    overflow: 'hidden',
  },
  heroCompact: {
    padding: 18,
    borderRadius: 28,
  },
  heroTiny: {
    padding: 16,
  },
  heroRow: {
    gap: 20,
  },
  heroRowWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  side: {
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  topLineCompact: {
    marginBottom: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconBadgeCompact: {
    width: 36,
    height: 36,
    borderRadius: 14,
  },
  statusChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  eyebrow: {
    color: 'rgba(255,247,237,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    fontWeight: '900',
    color: '#FFF8F1',
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(255,247,237,0.8)',
    lineHeight: 22,
    maxWidth: 640,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  statsWide: {
    justifyContent: 'flex-end',
  },
  statTile: {
    minWidth: 122,
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statTileCompact: {
    minWidth: 0,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 12,
  },
  statTileTiny: {
    flexBasis: '100%',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7EE',
  },
  statIconCompact: {
    width: 26,
    height: 26,
  },
  statValue: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF8F1',
  },
  statLabel: {
    marginTop: 4,
    color: 'rgba(255,247,237,0.72)',
    lineHeight: 18,
  },
  actionWrap: {
    marginTop: 14,
  },
});
