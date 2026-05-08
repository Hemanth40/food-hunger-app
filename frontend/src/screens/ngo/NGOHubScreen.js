/**
 * NGOHubScreen — Hub location manager (maps-free, Expo Go safe)
 * Uses expo-location for GPS + reverse geocoding.
 * Opens Google Maps externally for visual confirmation.
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, TextInput, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { AuthContext } from '../../context/AuthContext';
import { C, F, R, shadow } from '../../theme';

export default function NGOHubScreen() {
  const { user, updateProfile } = useContext(AuthContext);
  const [coords, setCoords]   = useState(
    typeof user?.latitude === 'number' && typeof user?.longitude === 'number'
      ? { latitude: user.latitude, longitude: user.longitude }
      : null
  );
  const [address, setAddress]   = useState(user?.address || '');
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  // Auto-detect if no saved location
  useEffect(() => {
    if (!coords) detectLocation();
  }, []);

  const detectLocation = async () => {
    setDetecting(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(c);
      reverseGeocode(c);
    } finally { setDetecting(false); }
  };

  const reverseGeocode = async (c) => {
    try {
      const results = await Location.reverseGeocodeAsync(c);
      const r = results?.[0];
      if (r) setAddress([r.name, r.street, r.city, r.region].filter(Boolean).join(', '));
    } catch {}
  };

  const saveHub = async () => {
    if (!coords) return;
    try {
      setSaving(true);
      await updateProfile({ latitude: coords.latitude, longitude: coords.longitude, address });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const openInMaps = () => {
    if (!coords) return;
    Linking.openURL(`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="map-marker-star" size={26} color={C.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hub Location</Text>
          <Text style={styles.sub}>Donors route food deliveries here</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Current location card */}
        <View style={styles.coordCard}>
          {coords ? (
            <>
              <View style={styles.coordRow}>
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>Latitude</Text>
                  <Text style={styles.coordValue}>{coords.latitude.toFixed(6)}</Text>
                </View>
                <View style={styles.coordDivider} />
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>Longitude</Text>
                  <Text style={styles.coordValue}>{coords.longitude.toFixed(6)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.mapsLink} onPress={openInMaps}>
                <Icon name="map-outline" size={16} color="#2563EB" />
                <Text style={styles.mapsLinkText}>View on Google Maps</Text>
                <Icon name="open-in-new" size={14} color="#2563EB" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noCoord}>
              <Icon name="map-marker-alert-outline" size={40} color={C.grey3} />
              <Text style={styles.noCoordText}>No location set yet</Text>
            </View>
          )}
        </View>

        {/* Address input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hub Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Full address of your NGO hub…"
            placeholderTextColor={C.grey3}
            multiline={true}
            numberOfLines={3}
          />
        </View>

        {/* Saved status */}
        {(user?.latitude && user?.longitude) && (
          <View style={styles.savedBadge}>
            <Icon name="check-circle" size={16} color={C.green} />
            <Text style={styles.savedText}>
              Hub saved at {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={detectLocation}
            disabled={detecting}
          >
            {detecting
              ? <ActivityIndicator size="small" color={C.brand} />
              : <Icon name="crosshairs-gps" size={18} color={C.brand} />}
            <Text style={styles.btnSecondaryText}>
              {detecting ? 'Detecting…' : 'Detect My Location'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, (!coords || saving) && { opacity: 0.6 }]}
            onPress={saveHub}
            disabled={!coords || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name={saved ? 'check' : 'content-save-outline'} size={18} color="#fff" />}
            <Text style={styles.btnPrimaryText}>
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Hub Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help note */}
        <View style={styles.helpCard}>
          <Icon name="information-outline" size={18} color={C.grey2} />
          <Text style={styles.helpText}>
            Your hub location tells restaurants and volunteers where to deliver rescued food.
            Tap "Detect My Location" to use your current GPS position, or open Google Maps
            to manually pin your exact hub address.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F6F6' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  title: { fontSize: F.lg, fontWeight: '800', color: C.black },
  sub:   { fontSize: F.xs, color: C.grey2, marginTop: 2 },

  content: { padding: 16, gap: 16, paddingBottom: 60 },

  coordCard: {
    backgroundColor: '#fff', borderRadius: R.lg,
    padding: 16, ...shadow,
  },
  coordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  coordItem: { flex: 1, alignItems: 'center' },
  coordLabel: { fontSize: F.xs, color: C.grey2, marginBottom: 4, fontWeight: '600' },
  coordValue: { fontSize: F.sm, fontWeight: '700', color: C.black },
  coordDivider: { width: 1, height: 40, backgroundColor: C.divider, marginHorizontal: 12 },
  mapsLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: R.md, padding: 10,
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  mapsLinkText: { flex: 1, color: '#2563EB', fontWeight: '600', fontSize: F.sm },
  noCoord: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noCoordText: { color: C.grey2, fontSize: F.sm },

  section: { gap: 8 },
  sectionTitle: { fontSize: F.sm, fontWeight: '700', color: C.black },
  input: {
    backgroundColor: '#fff', borderRadius: R.md,
    borderWidth: 1, borderColor: C.divider,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: F.sm, color: C.black, textAlignVertical: 'top',
    minHeight: 80, ...shadow,
  },

  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: R.md, padding: 12,
    borderWidth: 1, borderColor: C.green + '40',
  },
  savedText: { fontSize: F.xs, color: C.green, fontWeight: '600' },

  actions: { gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, borderRadius: R.md,
  },
  btnPrimary: { backgroundColor: C.brand },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: F.md },
  btnSecondary: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.brand,
  },
  btnSecondaryText: { color: C.brand, fontWeight: '700', fontSize: F.sm },

  helpCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F9F9F9', borderRadius: R.md, padding: 14,
  },
  helpText: { flex: 1, fontSize: F.xs, color: C.grey2, lineHeight: 18 },
});
