/**
 * DeliveryRouteMap — maps-free route card (Expo Go safe).
 * Shows pickup/dropoff details + Google Maps nav link.
 * react-native-maps crashes in Expo Go New Architecture (Fabric codegen bug).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { C, F, R, shadow } from '../theme';

export default function DeliveryRouteMap({
  pickupCoord,
  dropoffCoord,
  pickupAddress,
  dropoffAddress,
  foodType,
  quantity,
  distanceKm,
  driverPos,
}) {
  console.log("[DeliveryRouteMap Props]", {
    pickupCoord,
    dropoffCoord,
    pickupAddress,
    dropoffAddress,
    foodType,
    quantity
  });
  const hasPickupCoord = pickupCoord?.latitude != null && pickupCoord?.longitude != null;
  const hasDropoffCoord = dropoffCoord?.latitude != null && dropoffCoord?.longitude != null;

  const showPickup  = !!pickupAddress || hasPickupCoord;
  const showDropoff = !!dropoffAddress || hasDropoffCoord;

  const getCoordString = (coord) => {
    if (!coord) return 'No coordinates';
    const lat = typeof coord.latitude === 'number' ? coord.latitude : parseFloat(coord.latitude);
    const lng = typeof coord.longitude === 'number' ? coord.longitude : parseFloat(coord.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    return 'No coordinates';
  };

  const openPickup = () => {
    if (!hasPickupCoord) return;
    Linking.openURL(`https://www.google.com/maps?q=${pickupCoord.latitude},${pickupCoord.longitude}`);
  };

  const openDropoff = () => {
    if (!hasDropoffCoord) return;
    Linking.openURL(`https://www.google.com/maps?q=${dropoffCoord.latitude},${dropoffCoord.longitude}`);
  };

  const openFullRoute = () => {
    if (!hasPickupCoord || !hasDropoffCoord) return;
    const origin = driverPos?.latitude
      ? `${driverPos.latitude},${driverPos.longitude}`
      : `${pickupCoord.latitude},${pickupCoord.longitude}`;
    Linking.openURL(
      `https://www.google.com/maps/dir/${origin}/${pickupCoord.latitude},${pickupCoord.longitude}/${dropoffCoord.latitude},${dropoffCoord.longitude}`
    );
  };

  return (
    <View style={styles.card}>
      {/* Route steps */}
      <View style={styles.routeWrap}>
        {/* Pickup */}
        {showPickup && (
          <View style={styles.step}>
            <View style={styles.stepLeft}>
              <View style={[styles.dot, { backgroundColor: C.green }]} />
              {showDropoff && <View style={styles.line} />}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepLabel}>PICKUP</Text>
              <Text style={styles.stepAddr} numberOfLines={2}>
                {pickupAddress || getCoordString(pickupCoord)}
              </Text>
              {hasPickupCoord && (
                <TouchableOpacity style={styles.miniBtn} onPress={openPickup}>
                  <Icon name="map-marker-outline" size={12} color="#2563EB" />
                  <Text style={styles.miniBtnText}>View on map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Dropoff */}
        {showDropoff && (
          <View style={styles.step}>
            <View style={styles.stepLeft}>
              <View style={[styles.dot, { backgroundColor: C.brand }]} />
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepLabel}>DROPOFF</Text>
              <Text style={styles.stepAddr} numberOfLines={2}>
                {dropoffAddress || getCoordString(dropoffCoord)}
              </Text>
              {hasDropoffCoord && (
                <TouchableOpacity style={styles.miniBtn} onPress={openDropoff}>
                  <Icon name="map-marker-outline" size={12} color="#2563EB" />
                  <Text style={styles.miniBtnText}>View on map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Meta chips */}
      <View style={styles.chips}>
        {foodType && (
          <View style={styles.chip}>
            <Icon name="food" size={12} color={C.grey2} />
            <Text style={styles.chipText}>{foodType}</Text>
          </View>
        )}
        {quantity && (
          <View style={styles.chip}>
            <Icon name="account-group" size={12} color={C.grey2} />
            <Text style={styles.chipText}>{quantity} servings</Text>
          </View>
        )}
        {distanceKm != null && (
          <View style={styles.chip}>
            <Icon name="map-marker-distance" size={12} color={C.grey2} />
            <Text style={styles.chipText}>{distanceKm} km</Text>
          </View>
        )}
      </View>

      {/* Navigate CTA */}
      {(hasPickupCoord && hasDropoffCoord) && (
        <TouchableOpacity style={styles.navBtn} onPress={openFullRoute}>
          <Icon name="navigation" size={18} color="#fff" />
          <Text style={styles.navBtnText}>Open Full Route in Google Maps</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: R.lg,
    padding: 14, ...shadow,
  },
  routeWrap: { gap: 0, marginBottom: 12 },
  step: { flexDirection: 'row', gap: 10, paddingBottom: 12 },
  stepLeft: { alignItems: 'center', width: 14 },
  dot:  { width: 12, height: 12, borderRadius: 6 },
  line: { flex: 1, width: 2, backgroundColor: C.divider, marginTop: 4 },
  stepBody: { flex: 1 },
  stepLabel: { fontSize: 10, fontWeight: '700', color: C.grey3, letterSpacing: 0.8, marginBottom: 2 },
  stepAddr:  { fontSize: F.sm, fontWeight: '600', color: C.black, marginBottom: 4 },

  miniBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#DBEAFE', alignSelf: 'flex-start',
  },
  miniBtnText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F6F6F6', borderRadius: R.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: C.grey2, fontWeight: '600' },

  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1A73E8', borderRadius: R.md, height: 44,
  },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: F.sm },
});
