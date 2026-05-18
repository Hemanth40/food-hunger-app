import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform, Linking, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, IconButton, Avatar, useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { AuthContext } from '../../context/AuthContext';
import AuraBackground from '../../components/AuraBackground';
import client from '../../api/client';
import { C, F } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function LiveTrackerScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const webRef = useRef(null);

  const {
    requestId,
    donationId,
    status,
    restaurantLocation,
    restaurantName,
    ngoLocation,
    ngoName,
    volunteerName,
  } = route.params;

  const [currentLocation, setCurrentLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null); // real-time driver GPS
  const [distance, setDistance] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [renderMap, setRenderMap] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRenderMap(true), 350);
    return () => clearTimeout(t);
  }, []);

  // --- Get current device location ---
  useEffect(() => {
    (async () => {
      let { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        setCurrentLocation(restaurantLocation);
      }
    })();
  }, []);

  // --- VOLUNTEER: Push GPS to backend every 10s ---
  useEffect(() => {
    if (user?.role !== 'volunteer' || !requestId || !currentLocation) return;
    const pushLocation = async () => {
      try {
        await client.put(`/requests/${requestId}/driver-location`, {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
      } catch (_) {}
    };
    pushLocation();
    const interval = setInterval(pushLocation, 10000);
    return () => clearInterval(interval);
  }, [user?.role, requestId, currentLocation]);

  // --- RESTAURANT / NGO: Poll driver location every 10s and update map ---
  useEffect(() => {
    if (user?.role === 'volunteer' || !requestId || !volunteerName) return;
    const pollDriverLocation = async () => {
      try {
        const res = await client.get(`/requests/${requestId}/driver-location`);
        if (res.data?.latitude && res.data?.longitude) {
          const loc = { latitude: res.data.latitude, longitude: res.data.longitude };
          setDriverLocation(loc);
          // Inject updated driver position into the live WebView map
          if (webRef.current) {
            webRef.current.injectJavaScript(`
              if (window.driverMarker) {
                window.driverMarker.setLatLng([${res.data.latitude}, ${res.data.longitude}]);
              }
              true;
            `);
          }
        }
      } catch (_) {}
    };
    pollDriverLocation();
    const interval = setInterval(pollDriverLocation, 10000);
    return () => clearInterval(interval);
  }, [user?.role, requestId, volunteerName]);

  // Volunteer phase logic — must be computed BEFORE the distance effect below
  let origin, destination, isPickupPhase;
  let volunteerNextStatus = null;
  let volunteerBtnLabel = '';
  let volunteerBtnIcon = '';

  if (user?.role === 'volunteer') {
    if (status === 'accepted' || status === 'approved') {
      origin = currentLocation || restaurantLocation; 
      destination = restaurantLocation;
      isPickupPhase = true;
      volunteerNextStatus = 'driver_reached';
      volunteerBtnLabel = 'Reached Restaurant';
      volunteerBtnIcon = 'map-marker-check';
    } else if (status === 'driver_reached') {
      origin = currentLocation || restaurantLocation; 
      destination = ngoLocation;
      isPickupPhase = false;
      volunteerNextStatus = 'picked_up';
      volunteerBtnLabel = "I've Picked It Up";
      volunteerBtnIcon = 'package-variant-closed';
    } else {
      origin = currentLocation || restaurantLocation; 
      destination = ngoLocation;
      isPickupPhase = false;
      volunteerNextStatus = 'delivered';
      volunteerBtnLabel = "I've Delivered It";
      volunteerBtnIcon = 'check-decagram';
    }
  } else {
    origin = restaurantLocation;
    destination = ngoLocation;
    isPickupPhase = (status === 'approved');
  }

  // Distance computation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (origin && destination) {
      const R = 6371;
      const dLat = (destination.latitude - origin.latitude) * Math.PI / 180;
      const dLon = (destination.longitude - origin.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(origin.latitude * Math.PI / 180) * Math.cos(destination.latitude * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistance(R * c);
    }
  }, [status, currentLocation]);

  // For single-device testing: offset dest if same as origin
  let safeOrigin = origin;
  let safeDest = destination;
  if (origin && destination && 
      Math.abs(origin.latitude - destination.latitude) < 0.0001 && 
      Math.abs(origin.longitude - destination.longitude) < 0.0001) {
    safeDest = { latitude: destination.latitude + 0.005, longitude: destination.longitude + 0.005 };
  }

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #111; }
        html, body, #map { height: 100vh; width: 100vw; }
        .leaflet-control-container { display: none; }
        .pip-marker { width: 16px; height: 16px; border-radius: 8px; border: 3px solid #000; box-shadow: 0 0 10px rgba(255,255,255,0.5); }
      </style>
    </head>
    <body style="background-color: transparent;">
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false, attributionControl: false });
        
        // Dark Mode Maps (Digital Alchemist vibe)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

        ${safeOrigin && safeDest ? `
          var status = "${status}";
          var hasDriver = ${volunteerName ? 'true' : 'false'};
          var userRole = "${user?.role || 'donor'}";
          var isSelfDelivery = status === 'self_delivery_active';

          var p1 = [${safeOrigin.latitude}, ${safeOrigin.longitude}];
          var p2 = [${safeDest.latitude}, ${safeDest.longitude}];

          if (userRole === 'volunteer' || isSelfDelivery) {
            // --- VOLUNTEER & SELF-DELIVERY VIEW: Show full route & navigation ---
            map.fitBounds([p1, p2], { paddingTopLeft: [20, 100], paddingBottomRight: [20, 250], maxZoom: 15 });

            // Fetch real street-routing from free OSRM API
            var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/${safeOrigin.longitude},${safeOrigin.latitude};${safeDest.longitude},${safeDest.latitude}?overview=full&geometries=geojson';
            
            fetch(osrmUrl)
              .then(res => res.json())
              .then(data => {
                 if(data.routes && data.routes.length > 0) {
                   var coords = data.routes[0].geometry.coordinates;
                   var latLngs = coords.map(c => [c[1], c[0]]);
                   
                   L.polyline(latLngs, { color: '#111', weight: 8, opacity: 0.6, lineCap: 'round', lineJoin: 'round' }).addTo(map);
                   L.polyline(latLngs, { color: '#CCFF00', weight: 4, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);

                   // Mock Driver Marker (always at p1)
                   if ((hasDriver || isSelfDelivery) && status !== 'pending') {
                      var driverHtml = '<div style="background-color: #fff; width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(204, 255, 0, 0.6); font-size: 16px; border: 2px solid #000;">🛵</div>';
                      var driverIcon = L.divIcon({ className: '', html: driverHtml, iconSize: [32, 32], iconAnchor: [16, 16] });
                      L.marker(p1, { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
                   }
                 } else {
                   L.polyline([p1, p2], { color: '#CCFF00', weight: 4, dashArray: '10, 15', lineCap: 'round' }).addTo(map);
                 }
              })
              .catch(() => {
                 L.polyline([p1, p2], { color: '#CCFF00', weight: 4, dashArray: '10, 15', lineCap: 'round' }).addTo(map);
              });

            var origIcon = L.divIcon({ className: '', html: '<div class="pip-marker" style="background-color: #FF6B00;"></div>' });
            L.marker(p1, { icon: origIcon }).addTo(map);

            var destIcon = L.divIcon({ className: '', html: '<div class="pip-marker" style="background-color: #CCFF00;"></div>' });
            L.marker(p2, { icon: destIcon }).addTo(map);

          } else {
            // --- RESTAURANT / NGO VIEW: Single marker ---
            // Use real driver GPS from state if available, else fall back to status-based estimate
            var realDriverLat = ${driverLocation?.latitude || 'null'};
            var realDriverLng = ${driverLocation?.longitude || 'null'};
            var hasRealLocation = realDriverLat !== null && realDriverLng !== null;
            var isSelfDelivery = status === 'self_delivery_active';
            var singlePos;
            var isDriverMarker = false;

            if (isSelfDelivery || !hasDriver) {
               singlePos = p2; // NGO location (fixed)
               var icon = L.divIcon({ className: '', html: '<div class="pip-marker" style="background-color: #CCFF00;"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
               L.marker(singlePos, { icon: icon }).addTo(map);
               map.setView(singlePos, 15);
            } else {
               // Show driver location
               isDriverMarker = true;
               var driverHtml = '<div style="background-color: #fff; width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(204, 255, 0, 0.6); font-size: 16px; border: 2px solid #000;">🛵</div>';
               var driverIcon = L.divIcon({ className: '', html: driverHtml, iconSize: [32, 32], iconAnchor: [16, 16] });
               
               if (hasRealLocation) {
                   singlePos = [realDriverLat, realDriverLng];
               } else {
                   // Fallback based on status while waiting for first GPS push
                   if (status === 'approved' || status === 'driver_reached') singlePos = p1;
                   else if (status === 'picked_up') singlePos = [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2];
                   else singlePos = p2;
               }
               
               // Store marker on window so it can be updated via injectJavaScript
               window.driverMarker = L.marker(singlePos, { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
               map.setView(singlePos, 15);
            }
          }
        ` : ''}

      </script>
    </body>
    </html>
  `;

  return (
    <AuraBackground>
      <View style={styles.container}>
        
        {/* Floating Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left" iconColor="#fff" containerColor="rgba(0,0,0,0.5)" size={24}
            onPress={() => navigation.goBack()}
          />
          <Text variant="titleMedium" style={styles.headerText}>Order Status</Text>
          <IconButton icon="help-circle-outline" iconColor="#fff" containerColor="rgba(0,0,0,0.5)" size={24} />
        </View>

        {/* Full Screen In-App WebView Map Engine */}
        {renderMap ? (
          <WebView
            ref={webRef}
            source={{ html: mapHtml }}
            style={StyleSheet.absoluteFillObject}
            bounces={false} scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            containerStyle={{ backgroundColor: 'transparent' }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color="#CCFF00" />
          </View>
        )}

        {/* Floating ETA Tag */}
        {distance > 0 && (
          <View style={styles.etaContainer}>
            <BlurView intensity={80} tint="dark" style={styles.etaBlur}>
              <Text style={styles.etaLabel}>DISTANCE</Text>
              <Text style={styles.etaValue}>{distance.toFixed(1)} km</Text>
            </BlurView>
          </View>
        )}

        {/* Bottom Glass Information Cards (Swiggy UI Adaptation) */}
        <View style={styles.sheetContainer}>
          <BlurView intensity={100} tint="dark" style={styles.sheet}>
            
            {/* Delivery Destination Status */}
            <View style={styles.sheetHeader}>
              <Text variant="labelLarge" style={{ color: theme.colors.secondary }}>
                {!volunteerName || status === 'approved' ? 'Picking up at' : 'Delivering to'}
              </Text>
              <Text variant="titleMedium" style={styles.targetName}>
                {!volunteerName || status === 'approved' ? restaurantName : ngoName}
              </Text>
            </View>

            {/* Profiles & Actions Row */}
            <View style={styles.profilesRow}>
              
              {/* Dynamic Left Profile (Chef / Partner) */}
              <View style={styles.profileCard}>
                <Avatar.Icon size={40} icon="chef-hat" style={{ backgroundColor: 'rgba(255, 107, 0, 0.2)' }} color={theme.colors.primary} />
                <View style={styles.profileText}>
                  <Text style={styles.cardTitle}>{restaurantName}</Text>
                  <Text style={styles.cardSubtitle}>
                    {status === 'approved' ? 'Preparing food' : status === 'driver_reached' ? 'Handing over food' : 'Food dispatched'}
                  </Text>
                </View>
              </View>

              {/* Dynamic Right Profile (Driver / NGO) */}
              {status !== 'self_delivery_active' && (
                <View style={styles.profileCard}>
                  <Avatar.Icon 
                    size={40} 
                    icon={!volunteerName ? "account-search" : "motorbike"} 
                    style={{ backgroundColor: !volunteerName ? 'rgba(255,255,255,0.1)' : 'rgba(204, 255, 0, 0.2)' }} 
                    color={theme.colors.secondary} 
                  />
                  <View style={styles.profileText}>
                    <Text style={styles.cardTitle}>
                      {!volunteerName ? "Driver: Not Assigned" : volunteerName}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {!volunteerName ? 'Waiting for volunteer' 
                       : status === 'approved' ? 'On the way to pickup' 
                       : status === 'driver_reached' ? 'At restaurant' 
                       : 'On the way to dropoff'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Delivery Details */}
            <View style={styles.bannerRow}>
               <Icon name="shield-check" size={24} color={theme.colors.secondary} />
               <View style={{ marginLeft: 12, flex: 1 }}>
                 <Text style={{ color: '#fff', fontWeight: 'bold' }}>Food Hunger App — Delivery Secured.</Text>
                 <Text style={{ color: '#aaa', fontSize: 12 }}>Tracking inside the Food Hunger App network.</Text>
               </View>
            </View>

            {/* Volunteer Action Buttons */}
            {user?.role === 'volunteer' && (
              <View style={styles.actionBlock}>
                
                {/* 1. Navigate Button */}
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={() => {
                    const orig = currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : '';
                    const dest = `${destination.latitude},${destination.longitude}`;
                    const url = orig ? `https://www.google.com/maps/dir/${orig}/${dest}` : `https://www.google.com/maps?q=${dest}`;
                    Linking.openURL(url);
                  }}
                >
                  <Icon name="navigation-variant" size={20} color="#fff" />
                  <Text style={styles.navBtnText}>Turn-by-turn Navigation</Text>
                </TouchableOpacity>

                {/* 2. Status Update Button */}
                {status !== 'delivered' && (
                  <TouchableOpacity 
                    style={[styles.statusButton, updating && { opacity: 0.7 }]}
                    disabled={updating}
                    onPress={async () => {
                      if (!requestId) return;
                      const nextStatus = volunteerNextStatus;
                      try {
                        setUpdating(true);
                        await client.put(`/requests/${requestId}/status`, { status: nextStatus });
                        Alert.alert('Status Updated', `Order marked as ${nextStatus.replace('_', ' ')}!`);
                        navigation.goBack();
                      } catch (err) {
                        Alert.alert('Error', 'Failed to update status.');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                  >
                    {updating ? <ActivityIndicator size="small" color={C.black} /> : (
                      <>
                        <Icon name={volunteerBtnIcon} size={20} color={C.black} />
                        <Text style={styles.statusBtnText}>{volunteerBtnLabel}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
              </View>
            )}

          </BlurView>
        </View>

      </View>
    </AuraBackground>
  );
}

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40,
    left: 10, right: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 100,
  },
  headerText: { color: '#fff', fontWeight: 'bold' },
  etaContainer: {
    position: 'absolute', top: height * 0.45,
    width: '100%', alignItems: 'center',
  },
  etaBlur: {
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30,
    alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  etaLabel: { color: '#aaa', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  etaValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  sheetContainer: { position: 'absolute', bottom: 0, width: '100%' },
  sheet: {
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderBottomWidth: 0,
  },
  sheetHeader: { marginBottom: 20 },
  targetName: { color: '#fff', fontWeight: 'bold', marginTop: 4 },
  profilesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 20 },
  profileCard: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: 12,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  profileText: { marginTop: 10 },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cardSubtitle: { color: '#aaa', fontSize: 11, marginTop: 2 },
  bannerRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(204, 255, 0, 0.1)',
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(204, 255, 0, 0.2)',
  },
  actionBlock: { marginTop: 16, gap: 10 },
  navButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12,
  },
  navBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#CCFF00', paddingVertical: 14, borderRadius: 12,
  },
  statusBtnText: { color: C.black, fontSize: 16, fontWeight: '800' }
});
