import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { C, F, R, shadow } from '../theme';

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setError('');
      detectLocation();
    }
  }, [visible]);

  const detectLocation = async () => {
    setLoading(true);
    setError('');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission denied.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      applyCoords(c);
    } catch {
      setError('Could not access GPS automatically. Please enter coordinates.');
    } finally {
      setLoading(false);
    }
  };

  const applyCoords = async (c) => {
    setCoords(c);
    setLatInput(String(c.latitude.toFixed(6)));
    setLngInput(String(c.longitude.toFixed(6)));
    try {
      const places = await Location.reverseGeocodeAsync(c);
      const p = places?.[0];
      if (p) setAddress([p.name, p.street, p.city].filter(Boolean).join(', '));
    } catch {}
  };

  const applyManual = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Invalid coordinates');
      return;
    }
    setError('');
    applyCoords({ latitude: lat, longitude: lng });
  };

  const handleConfirm = () => {
    if (!coords) return;
    onSelectLocation({ latitude: coords.latitude, longitude: coords.longitude, address });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        
        <View style={styles.header}>
          <TouchableOpacity style={{ padding: 6 }} onPress={onClose}>
            <Icon name="close" size={24} color={C.black} />
          </TouchableOpacity>
          <Text style={styles.title}>Pick Location (Web Version)</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.warningBox}>
            <Icon name="cellphone-marker" size={32} color={C.brand} />
            <Text style={styles.warningText}>
              The Interactive Draggable Map is only supported on the native Mobile application. On web, please use GPS detection or manual entry.
            </Text>
          </View>

          <TouchableOpacity style={styles.detectBtn} onPress={detectLocation} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Icon name="crosshairs-gps" size={20} color="#fff" />}
            <Text style={styles.detectBtnText}>{loading ? 'Detecting...' : 'Use My GPS Location'}</Text>
          </TouchableOpacity>

          {coords && (
            <View style={styles.addressCard}>
              <Icon name="check-circle" size={20} color={C.green} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressTitle}>Location Captured</Text>
                <Text style={styles.addressBody}>{address || `${coords.latitude}, ${coords.longitude}`}</Text>
              </View>
            </View>
          )}

          {/* Manual Entry Fallback */}
          <Text style={styles.label}>Manual Coordinates Override:</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={latInput} onChangeText={setLatInput} placeholder="Latitude" />
            <TextInput style={styles.input} value={lngInput} onChangeText={setLngInput} placeholder="Longitude" />
            <TouchableOpacity style={styles.applyBtn} onPress={applyManual}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Set</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.confirmBtn, !coords && { opacity: 0.5 }]} 
            onPress={handleConfirm}
            disabled={!coords}
          >
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: F.lg, fontWeight: '700' },
  content: { padding: 20, gap: 16 },
  warningBox: { backgroundColor: '#FFF4F2', padding: 20, borderRadius: 12, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FFE4E1' },
  warningText: { color: '#FF6B00', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
  detectBtn: { backgroundColor: '#FF6B00', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  detectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  addressCard: { flexDirection: 'row', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  addressTitle: { fontWeight: 'bold', fontSize: 16 },
  addressBody: { color: '#444', marginTop: 4 },
  label: { fontWeight: '600', marginTop: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  applyBtn: { backgroundColor: '#333', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  confirmBtn: { backgroundColor: '#FFB800', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  confirmBtnText: { fontWeight: 'bold', fontSize: 18, color: '#000' }
});
