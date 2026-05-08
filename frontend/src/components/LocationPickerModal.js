import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { C, F, R, shadow } from '../theme';

const { width, height } = Dimensions.get('window');

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
  const webRef = useRef(null);
  const [region, setRegion] = useState({ latitude: 12.9716, longitude: 77.5946 }); // Default Bangalore
  const [address, setAddress] = useState('Detecting location...');
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [error, setError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (visible) {
      setError('');
      setAddress('Detecting location...');
      detectLocation();
    }
  }, [visible]);

  const detectLocation = async () => {
    setLoadingAddr(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission denied.');
        setLoadingAddr(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setRegion(newCoords);
      reverseGeocode(newCoords);
      
      // If WebView is ready, instantly jump the map to new coordinates
      if (webRef.current) {
        webRef.current.injectJavaScript(`map.setView([${newCoords.latitude}, ${newCoords.longitude}], 16); true;`);
      }
    } catch (e) {
      setError('Could not get initial location.');
      setLoadingAddr(false);
    }
  };

  const reverseGeocode = async (coords) => {
    setLoadingAddr(true);
    try {
      const places = await Location.reverseGeocodeAsync(coords);
      const p = places?.[0];
      if (p) {
        setAddress([p.name, p.street, p.city, p.region].filter(Boolean).join(', '));
      } else {
        setAddress('Unknown Location');
      }
    } catch {
      setAddress('Location found (' + coords.latitude.toFixed(4) + ', ' + coords.longitude.toFixed(4) + ')');
    } finally {
      setLoadingAddr(false);
    }
  };

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'onRegionChangeComplete') {
        const newCoords = { latitude: data.latitude, longitude: data.longitude };
        setRegion(newCoords);
        reverseGeocode(newCoords);
      }
    } catch (e) {}
  };

  const handleConfirm = () => {
    onSelectLocation({ 
      latitude: region.latitude, 
      longitude: region.longitude, 
      address 
    });
    onClose();
  };

  // The Lightweight Leaflet HTML Engine
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #E2E8F0; }
        html, body, #map { height: 100vh; width: 100vw; }
        .leaflet-control-container { display: none; } /* Hide all default UI buttons */
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        
        var map = L.map('map', { 
           zoomControl: false, 
           attributionControl: false 
        }).setView([${region.latitude}, ${region.longitude}], 16);
        
        // Clean Voyager Basemap (Swiggy styling)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(map);

        map.on('moveend', function() {
          var center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'onRegionChangeComplete', 
            latitude: center.lat, 
            longitude: center.lng 
          }));
        });
      </script>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        
        {/* Full Screen In-App Map rendering engine */}
        <WebView
          ref={webRef}
          source={{ html: mapHtml }}
          style={StyleSheet.absoluteFillObject}
          onMessage={onMessage}
          onLoadEnd={() => setMapLoaded(true)}
          bounces={false}
          scrollEnabled={false}
          javaScriptEnabled={true}
        />

        {/* Center Floating Pin Overlay (Locks exactly in the middle of React Native) */}
        {mapLoaded && (
          <View style={styles.pinContainer} pointerEvents="none">
            <Icon name="map-marker" size={48} color="#FF6B00" />
            <View style={styles.pinShadow} />
          </View>
        )}

        {/* Floating Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>

        {/* Floating Current Location Auto-Detect Button */}
        <TouchableOpacity style={styles.gpsBtn} onPress={detectLocation}>
          <Icon name="crosshairs-gps" size={24} color="#000" />
        </TouchableOpacity>

        {/* Bottom Glass Information Card */}
        <View style={styles.bottomSheet}>
          <View style={styles.handleBar} />
          
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Select your location</Text>
            <TouchableOpacity style={styles.changeBtn} onPress={detectLocation}>
              <Text style={styles.changeBtnText}>Locate Me</Text>
            </TouchableOpacity>
          </View>

          {/* Active Address Input Override */}
          <View style={styles.addressCard}>
            <Icon name="target" size={20} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              {loadingAddr ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.addressTextSecondary}>Fetching details...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.addressTextPrimary} numberOfLines={1}>
                    {address?.split(',')[0] || 'Dragged Location'}
                  </Text>
                  <Text style={styles.addressTextSecondary} numberOfLines={2}>
                    {address}
                  </Text>
                </>
              )}
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity 
            style={[styles.confirmBtn, loadingAddr && { opacity: 0.6 }]} 
            onPress={handleConfirm}
            disabled={loadingAddr}
          >
            <Text style={styles.confirmBtnText}>Save & Proceed</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E2E8F0' },
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -48,
    alignItems: 'center',
    zIndex: 10,
  },
  pinShadow: {
    width: 12, height: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -4,
  },
  backBtn: {
    position: 'absolute',
    top: 50, left: 16,
    backgroundColor: '#fff',
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
    ...shadow,
  },
  gpsBtn: {
    position: 'absolute',
    bottom: 270, right: 16,
    backgroundColor: '#fff',
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
    ...shadow,
  },
  bottomSheet: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
    zIndex: 100,
    ...shadow,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.divider,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: F.lg, fontWeight: '800', color: C.black },
  changeBtn: { borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.full },
  changeBtnText: { fontSize: F.sm, fontWeight: '700', color: C.black },
  addressCard: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: R.md, padding: 16, marginBottom: 24 },
  addressTextPrimary: { fontSize: F.md, fontWeight: '700', color: C.black },
  addressTextSecondary: { fontSize: F.sm, color: C.grey2, marginTop: 4 },
  errorText: { color: C.brand, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  confirmBtn: { backgroundColor: '#FFB800', height: 54, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: C.black, fontSize: F.md, fontWeight: '800' },
});
