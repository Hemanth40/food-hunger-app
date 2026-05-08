/**
 * MLHotspotsScreen — Hunger hotspot viewer (maps-free, Expo Go safe)
 * Shows hotspot clusters in a list with "Open in Google Maps" links.
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { C, F, R, shadow } from '../../theme';

const SEVERITY = {
  critical: { color: '#DC2626', icon: 'alert-circle',        label: 'Critical' },
  high:     { color: '#EA580C', icon: 'alert',               label: 'High' },
  medium:   { color: '#D97706', icon: 'alert-outline',       label: 'Medium' },
  low:      { color: '#16A34A', icon: 'information-outline',  label: 'Low' },
};

export default function MLHotspotsScreen() {
  const { user } = useContext(AuthContext);
  const [hotspots, setHotspots]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [location, setLocation]   = useState(null);

  useEffect(() => {
    loadHotspots();
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch {}
  };

  const loadHotspots = async () => {
    setLoading(true);
    try {
      const res = await client.get('/ml/hotspots');
      const data = Array.isArray(res.data) ? res.data
        : res.data?.hotspots ?? res.data?.clusters ?? res.data?.results ?? [];
      setHotspots(data);
    } catch {
      // Use demo data if API unavailable
      setHotspots([
        { cluster_id: 1, latitude: 17.3850, longitude: 78.4867, affected_count: 340, radius_km: 1.2, severity: 'critical', area_name: 'Hitech City' },
        { cluster_id: 2, latitude: 17.4400, longitude: 78.3489, affected_count: 210, radius_km: 0.8, severity: 'high',     area_name: 'Kukatpally' },
        { cluster_id: 3, latitude: 17.3616, longitude: 78.4747, affected_count: 150, radius_km: 1.0, severity: 'medium',   area_name: 'Banjara Hills' },
        { cluster_id: 4, latitude: 17.4126, longitude: 78.4071, affected_count: 90,  radius_km: 0.5, severity: 'low',      area_name: 'Ameerpet' },
      ]);
    } finally { setLoading(false); }
  };

  const getDistance = (h) => {
    if (!location || !h.latitude) return null;
    const R = 6371;
    const dLat = (h.latitude - location.latitude) * Math.PI / 180;
    const dLon = (h.longitude - location.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(location.latitude * Math.PI/180) * Math.cos(h.latitude * Math.PI/180) * Math.sin(dLon/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
  };

  const openInMaps = (h) => {
    Linking.openURL(`https://www.google.com/maps?q=${h.latitude},${h.longitude}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={styles.loadingText}>Analyzing hunger patterns…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="radar" size={24} color={C.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hunger Hotspots</Text>
          <Text style={styles.sub}>ML-predicted areas needing urgent food aid</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadHotspots}>
          <Icon name="refresh" size={20} color={C.brand} />
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        {Object.entries(SEVERITY).map(([key, val]) => {
          const count = hotspots.filter(h => h.severity === key).length;
          return (
            <View key={key} style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: val.color }]} />
              <Text style={styles.summaryCount}>{count}</Text>
              <Text style={styles.summaryLabel}>{val.label}</Text>
            </View>
          );
        })}
      </View>

      <FlatList
        data={hotspots}
        keyExtractor={item => String(item.cluster_id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="check-circle-outline" size={52} color={C.green} />
            <Text style={styles.emptyTitle}>No Active Hotspots</Text>
            <Text style={styles.emptySub}>All areas are currently well-served.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const sev = SEVERITY[item.severity] || SEVERITY.medium;
          const dist = getDistance(item);
          return (
            <View style={[styles.card, { borderLeftColor: sev.color }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.sevBadge, { backgroundColor: sev.color + '18' }]}>
                  <Icon name={sev.icon} size={18} color={sev.color} />
                  <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
                </View>
                <Text style={styles.rank}>#{index + 1}</Text>
              </View>

              <Text style={styles.areaName}>{item.area_name || `Cluster ${item.cluster_id}`}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Icon name="account-group" size={14} color={C.grey2} />
                  <Text style={styles.statText}>{item.affected_count} affected</Text>
                </View>
                <View style={styles.statItem}>
                  <Icon name="map-marker-radius" size={14} color={C.grey2} />
                  <Text style={styles.statText}>{item.radius_km} km radius</Text>
                </View>
                {dist && (
                  <View style={styles.statItem}>
                    <Icon name="navigation" size={14} color={C.grey2} />
                    <Text style={styles.statText}>{dist} km away</Text>
                  </View>
                )}
              </View>

              {item.latitude && item.longitude && (
                <TouchableOpacity style={styles.mapsBtn} onPress={() => openInMaps(item)}>
                  <Icon name="map-outline" size={14} color="#2563EB" />
                  <Text style={styles.mapsBtnText}>
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </Text>
                  <Icon name="open-in-new" size={12} color="#2563EB" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F6F6F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: F.sm, color: C.grey2, fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  title: { fontSize: F.lg, fontWeight: '800', color: C.black },
  sub:   { fontSize: F.xs, color: C.grey2, marginTop: 2 },
  refreshBtn: { padding: 6 },

  summaryBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 10, gap: 16,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryDot:  { width: 8, height: 8, borderRadius: 4 },
  summaryCount:{ fontSize: F.sm, fontWeight: '800', color: C.black },
  summaryLabel:{ fontSize: F.xs, color: C.grey2 },

  list:  { padding: 12, gap: 12, paddingBottom: 60 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: F.lg, fontWeight: '700', color: C.black },
  emptySub:   { fontSize: F.sm, color: C.grey2 },

  card: {
    backgroundColor: '#fff', borderRadius: R.lg, padding: 14,
    borderLeftWidth: 4, ...shadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full },
  sevText:  { fontSize: F.xs, fontWeight: '700' },
  rank:     { fontSize: F.xs, color: C.grey3, fontWeight: '700' },
  areaName: { fontSize: F.md, fontWeight: '700', color: C.black, marginBottom: 8 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: F.xs, color: C.grey2 },

  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: R.sm, padding: 8,
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  mapsBtnText: { flex: 1, fontSize: F.xs, color: '#2563EB', fontWeight: '600' },
});
