/**
 * MapScreen (Volunteer Route Screen) — maps-free, Expo Go safe.
 * Shows turn-by-turn address info + Google Maps deep link for real navigation.
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { C, F, R, shadow } from '../../theme';

export default function MapScreen() {
  const { user } = useContext(AuthContext);
  const [job, setJob]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    loadActiveJob();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc.coords);
        }
      } catch {}
    })();
  }, []);

  const loadActiveJob = async () => {
    setLoading(true);
    try {
      const res = await client.get('/requests/driver/my');
      // Pick first accepted/picked_up job as the active one
      const active = res.data?.find(j => ['accepted','picked_up'].includes(j.status)) || res.data?.[0] || null;
      setJob(active);
    } catch {
      setJob(null);
    } finally { setLoading(false); }
  };

  const openGoogleMaps = (lat, lng, label = '') => {
    const dest = `${lat},${lng}`;
    const origin = location ? `${location.latitude},${location.longitude}` : '';
    const url = origin
      ? `https://www.google.com/maps/dir/${origin}/${dest}`
      : `https://www.google.com/maps?q=${dest}`;
    Linking.openURL(url);
  };

  const openFullRoute = () => {
    if (!job) return;
    const pick = `${job.pickup_latitude},${job.pickup_longitude}`;
    const drop = `${job.dropoff_latitude},${job.dropoff_longitude}`;
    const orig = location ? `${location.latitude},${location.longitude}` : pick;
    Linking.openURL(`https://www.google.com/maps/dir/${orig}/${pick}/${drop}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={styles.loadingText}>Loading your route…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Icon name="map-marker-path" size={24} color={C.brand} />
          <Text style={styles.title}>My Route</Text>
        </View>
        <View style={styles.center}>
          <Icon name="map-marker-off-outline" size={64} color={C.grey3} />
          <Text style={styles.emptyTitle}>No Active Delivery</Text>
          <Text style={styles.emptySub}>Accept a job from the Jobs tab to see your route here.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="map-marker-path" size={24} color={C.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Active Delivery</Text>
          <Text style={styles.sub}>Job #{job.id}</Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={openFullRoute}>
          <Icon name="navigation" size={18} color="#fff" />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Route summary card */}
        <View style={styles.routeCard}>
          <View style={styles.routeStep}>
            <View style={[styles.stepDot, { backgroundColor: C.green }]} />
            <View style={styles.stepLine} />
            <View style={styles.stepInfo}>
              <Text style={styles.stepLabel}>📦 PICKUP</Text>
              <Text style={styles.stepAddress}>{job.pickup_address || 'Pickup Location'}</Text>
              {job.pickup_latitude && (
                <TouchableOpacity style={styles.directionsBtn}
                  onPress={() => openGoogleMaps(job.pickup_latitude, job.pickup_longitude, 'Pickup')}>
                  <Icon name="directions" size={14} color="#2563EB" />
                  <Text style={styles.directionsBtnText}>Get Directions</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.routeStep}>
            <View style={[styles.stepDot, { backgroundColor: C.brand }]} />
            <View style={{ width: 2 }} />
            <View style={styles.stepInfo}>
              <Text style={styles.stepLabel}>🏠 DROPOFF</Text>
              <Text style={styles.stepAddress}>{job.dropoff_address || 'Dropoff Location'}</Text>
              {job.dropoff_latitude && (
                <TouchableOpacity style={styles.directionsBtn}
                  onPress={() => openGoogleMaps(job.dropoff_latitude, job.dropoff_longitude, 'Dropoff')}>
                  <Icon name="directions" size={14} color="#2563EB" />
                  <Text style={styles.directionsBtnText}>Get Directions</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Distance info */}
        <View style={styles.infoRow}>
          {job.distance_km != null && (
            <View style={styles.infoCard}>
              <Icon name="map-marker-distance" size={22} color={C.brand} />
              <Text style={styles.infoValue}>{job.distance_km} km</Text>
              <Text style={styles.infoLabel}>Distance</Text>
            </View>
          )}
          {job.food_type && (
            <View style={styles.infoCard}>
              <Icon name="food-fork-drink" size={22} color={C.green} />
              <Text style={styles.infoValue} numberOfLines={1}>{job.food_type}</Text>
              <Text style={styles.infoLabel}>Food Type</Text>
            </View>
          )}
          {job.quantity && (
            <View style={styles.infoCard}>
              <Icon name="account-group" size={22} color="#7C3AED" />
              <Text style={styles.infoValue}>{job.quantity}</Text>
              <Text style={styles.infoLabel}>Servings</Text>
            </View>
          )}
        </View>

        {/* Big Navigate CTA */}
        <TouchableOpacity style={styles.bigNavBtn} onPress={openFullRoute}>
          <Icon name="google-maps" size={24} color="#fff" />
          <View>
            <Text style={styles.bigNavBtnTitle}>Open Full Route in Google Maps</Text>
            <Text style={styles.bigNavBtnSub}>Pickup → Dropoff with real-time traffic</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F6F6F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: F.sm, color: C.grey2, fontWeight: '600' },
  emptyTitle:  { fontSize: F.xl, fontWeight: '700', color: C.black },
  emptySub:    { fontSize: F.sm, color: C.grey2, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  title:  { fontSize: F.lg, fontWeight: '800', color: C.black },
  sub:    { fontSize: F.xs, color: C.grey2 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.brand, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 8,
  },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: F.sm },

  content: { padding: 16, gap: 16, paddingBottom: 60 },

  routeCard: {
    backgroundColor: '#fff', borderRadius: R.lg, padding: 16, gap: 0, ...shadow,
  },
  routeStep: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepDot:   { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  stepLine:  { position: 'absolute', left: 6, top: 16, bottom: -16, width: 2, backgroundColor: C.divider },
  stepInfo:  { flex: 1 },
  stepLabel: { fontSize: F.xs, fontWeight: '700', color: C.grey2, marginBottom: 4, letterSpacing: 0.5 },
  stepAddress:{ fontSize: F.sm, fontWeight: '600', color: C.black, marginBottom: 6 },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EFF6FF', borderRadius: R.sm, padding: 7,
    borderWidth: 1, borderColor: '#DBEAFE', alignSelf: 'flex-start',
  },
  directionsBtnText: { fontSize: F.xs, color: '#2563EB', fontWeight: '600' },

  infoRow: { flexDirection: 'row', gap: 10 },
  infoCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: R.lg,
    padding: 14, alignItems: 'center', gap: 4, ...shadow,
  },
  infoValue: { fontSize: F.md, fontWeight: '800', color: C.black },
  infoLabel: { fontSize: F.xs, color: C.grey2 },

  bigNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A73E8', borderRadius: R.lg, padding: 18, ...shadow,
  },
  bigNavBtnTitle: { fontSize: F.md, fontWeight: '700', color: '#fff' },
  bigNavBtnSub:   { fontSize: F.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
