import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Alert,
  ScrollView, KeyboardAvoidingView, Platform, Image, StyleSheet,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import client from '../../api/client';
import Field from '../../components/Field';
import LocationPickerModal from '../../components/LocationPickerModal';
import { C, F, R, shadow } from '../../theme';
import { extractError } from '../../utils/errorUtils';

const DELIVERY_OPTS = [
  { value: 'driver', icon: 'motorbike',                  label: 'Driver' },
  { value: 'self',   icon: 'storefront-outline',          label: 'Self Deliver' },
  { value: 'flex',   icon: 'swap-horizontal-circle-outline', label: 'Flexible' },
];

export default function CreateDonationScreen({ navigation }) {
  const { user, updateProfile } = useContext(AuthContext);
  const [foodType, setFoodType]     = useState('');
  const [quantity, setQuantity]     = useState('');
  const [description, setDescription] = useState('');
  const [pickupAddress, setPickupAddress] = useState(user?.address || '');
  const [deliveryPref, setDeliveryPref]   = useState('flex');
  const [loading, setLoading]       = useState(false);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageUri, setImageUri]     = useState(null);
  const [showMap, setShowMap]       = useState(false);
  const [location, setLocation]     = useState(
    typeof user?.latitude === 'number' && typeof user?.longitude === 'number'
      ? { latitude: user.latitude, longitude: user.longitude }
      : null
  );
  const [error, setError]           = useState('');

  useEffect(() => {
    if (user) {
      if (user.address && !pickupAddress) {
        setPickupAddress(user.address);
      }
      if (typeof user.latitude === 'number' && typeof user.longitude === 'number' && !location) {
        setLocation({ latitude: user.latitude, longitude: user.longitude });
      }
    }
  }, [user]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to upload food images.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access to take food photos.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const useGPS = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync(loc.coords).catch(() => [null]);
    if (place) setPickupAddress([place.name, place.street, place.city].filter(Boolean).join(', '));
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
  };

  const submit = async () => {
    if (!imageBase64) { setError('Please add a photo of the food.'); return; }
    if (!foodType || !quantity) { setError('Fill in food name and quantity.'); return; }
    try {
      setLoading(true); setError('');
      let lat = location?.latitude || null;
      let lng = location?.longitude || null;
      let addr = pickupAddress;

      // Auto-detect GPS if not set
      if (!lat) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude; lng = loc.coords.longitude;
          // Try reverse geocoding if no address given
          if (!addr) {
            const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => [null]);
            if (place) addr = [place.name, place.street, place.city].filter(Boolean).join(', ');
          }
        }
      }

      if (!lat || !lng) {
        setError('Location is required. Tap "Pin on Map" or use GPS to set your address.');
        return;
      }

      // Backend requires pick_address min 5 chars
      if (!addr || addr.length < 5) addr = `${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`;

      // Backend requires expires_at — default to 24 hours from now
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await client.post('/donations/', {
        food_type: foodType,
        quantity: parseInt(quantity, 10),
        description,
        pickup_address: addr,
        delivery_preference: deliveryPref,
        latitude: lat,
        longitude: lng,
        expires_at: expiresAt,
        image_base64: imageBase64,
        image_mime_type: 'image/jpeg',
      });
      
      // Update user's static profile location if it changed or wasn't set
      const locationChanged =
        user?.latitude !== lat ||
        user?.longitude !== lng ||
        user?.address !== addr;
      if (locationChanged) {
        try {
          await updateProfile({ latitude: lat, longitude: lng, address: addr });
        } catch (profileErr) {
          console.log('Failed to update restaurant static location:', profileErr);
        }
      }
      
      // Clear form so previous details don't persist
      setFoodType('');
      setQuantity('');
      setDescription('');
      setImageBase64(null);
      setImageUri(null);
      setPickupAddress('');
      setLocation(null);
      
      navigation.goBack();
    } catch (err) {
      setError(extractError(err, 'Could not post donation'));
    } finally { setLoading(false); }
  };

  const canSubmit = foodType && quantity && imageBase64;


  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={22} color={C.black} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Post Food</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Photo upload */}
          <Text style={styles.sectionLabel}>Food Photo *</Text>
          {imageUri ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              <TouchableOpacity style={styles.changePhoto} onPress={pickImage}>
                <Icon name="camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} activeOpacity={0.7} onPress={takePhoto}>
                <Icon name="camera" size={28} color={C.grey2} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} activeOpacity={0.7} onPress={pickImage}>
                <Icon name="image-outline" size={28} color={C.grey2} />
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Fields */}
          <Text style={styles.sectionLabel}>Food Details</Text>
          <Field
            label="Food name"
            icon="food-outline"
            placeholder="e.g. Biryani, Chapati, Rice"
            value={foodType}
            onChangeText={setFoodType}
          />
          <Field
            label="Serves how many people?"
            icon="account-group-outline"
            placeholder="e.g. 50"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />
          <Field
            label="Description (optional)"
            icon="text-box-outline"
            placeholder="Any notes about freshness, allergens…"
            value={description}
            onChangeText={setDescription}
          />

          {/* Location */}
          <Text style={styles.sectionLabel}>Pickup Location</Text>
          <Field
            icon="map-marker-outline"
            placeholder="Enter address or use GPS"
            value={pickupAddress}
            onChangeText={setPickupAddress}
          />
          <View style={styles.locRow}>
            <TouchableOpacity style={styles.locBtn} activeOpacity={0.7} onPress={useGPS}>
              <Icon name="crosshairs-gps" size={16} color={C.brand} />
              <Text style={styles.locBtnText}>Use GPS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locBtn} activeOpacity={0.7} onPress={() => setShowMap(true)}>
              <Icon name="map" size={16} color={C.brand} />
              <Text style={styles.locBtnText}>{location ? 'Re-pin on Map' : 'Pin on Map'}</Text>
            </TouchableOpacity>
            {location && (
              <View style={styles.locDone}>
                <Icon name="check-circle" size={14} color={C.green} />
                <Text style={styles.locDoneText}>Pinned</Text>
              </View>
            )}
          </View>

          {/* Delivery preference */}
          <Text style={styles.sectionLabel}>Delivery mode</Text>
          <View style={styles.delivRow}>
            {DELIVERY_OPTS.map(opt => {
              const active = deliveryPref === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.delivBtn, active && styles.delivBtnActive]}
                  activeOpacity={0.7}
                  onPress={() => setDeliveryPref(opt.value)}
                >
                  <Icon name={opt.icon} size={20} color={active ? C.brand : C.grey2} />
                  <Text style={[styles.delivLabel, active && { color: C.brand }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color={C.brand} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || loading) && { opacity: 0.5 }]}
            onPress={submit}
            disabled={!canSubmit || loading}
            activeOpacity={0.8}
          >
            <Icon name="send" size={18} color="#fff" />
            <Text style={styles.submitText}>{loading ? 'Posting...' : 'Post Donation'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        onSelectLocation={(loc) => { setLocation(loc); setShowMap(false); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  topTitle: { fontSize: F.lg, fontWeight: '800', color: C.black },
  sectionLabel: { fontSize: F.sm, fontWeight: '700', color: C.grey1, marginBottom: 10, marginTop: 6 },

  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  photoBtn: {
    flex: 1, height: 90, borderRadius: R.lg, borderWidth: 1.5,
    borderColor: C.divider, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface, gap: 6,
  },
  photoBtnText: { fontSize: F.sm, color: C.grey2, fontWeight: '600' },
  imagePreview: { height: 180, borderRadius: R.lg, marginBottom: 20, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  changePhoto: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center',
  },

  locRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 20, marginTop: -8 },
  locBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.brandBg, borderRadius: R.full,
  },
  locBtnText: { fontSize: F.sm, color: C.brand, fontWeight: '600' },
  locDone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locDoneText: { fontSize: F.sm, color: C.green, fontWeight: '600' },

  delivRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  delivBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6,
    borderRadius: R.lg, borderWidth: 1, borderColor: C.divider, backgroundColor: C.surface,
  },
  delivBtnActive: { borderColor: C.brand, backgroundColor: C.brandBg },
  delivLabel: { fontSize: F.xs, fontWeight: '700', color: C.grey2 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF0F1', padding: 12, borderRadius: R.md, marginBottom: 16,
  },
  errorText: { fontSize: F.sm, color: C.brand, flex: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.brand, height: 52, borderRadius: R.md, marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: F.md, fontWeight: '700' },
});
