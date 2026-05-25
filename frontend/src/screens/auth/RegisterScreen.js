import React, { useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { AuthContext } from '../../context/AuthContext';
import Field from '../../components/Field';
import LocationPickerModal from '../../components/LocationPickerModal';
import { C, F, R } from '../../theme';
import { extractError } from '../../utils/errorUtils';

const ROLES = [
  { value: 'user',      icon: 'food-fork-drink',  label: 'Donor',     color: C.brand },
  { value: 'ngo',       icon: 'home-group',        label: 'NGO',       color: C.green },
  { value: 'volunteer', icon: 'motorbike',         label: 'Volunteer', color: '#2563EB' },
];

export default function RegisterScreen({ navigation }) {
  const { register, verifyOTP } = useContext(AuthContext);

  const [step, setStep]         = useState('form');
  const [phone, setPhone]       = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('user');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showMap, setShowMap]   = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [address, setAddress]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [otpHint, setOtpHint]   = useState(null);

  const submit = async () => {
    try {
      setLoading(true); setError('');
      const res = await register({
        full_name: fullName, phone, password, role,
        latitude: selectedLocation?.latitude,
        longitude: selectedLocation?.longitude,
        address: address || undefined,
      });
      if (res && res.otp_hint) {
        setOtpHint(res.otp_hint);
      } else {
        setOtpHint(null);
      }
      setStep('otp');
    } catch (err) {
      setError(extractError(err, 'Could not create account'));
    } finally { setLoading(false); }
  };

  const verifyRegistrationOtp = async () => {
    try {
      setLoading(true); setError('');
      await verifyOTP(phone.trim(), otp.trim());
    } catch (err) {
      setError(extractError(err, 'Invalid OTP'));
    } finally { setLoading(false); }
  };

  const needsLocation = role === 'ngo' || role === 'user' || role === 'restaurant';
  const canSubmit = fullName && phone.trim().length >= 10 && password.length >= 6;

  if (step === 'otp') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.back} onPress={() => setStep('form')}>
              <Icon name="arrow-left" size={22} color={C.black} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={styles.otpIcon}>
                <Icon name="message-text-outline" size={32} color={C.brand} />
              </View>
              <Text style={styles.title}>Verify your phone</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
                {'Enter the verification code for\n+91 ' + phone.trim().slice(-10)}
              </Text>
            </View>

            {otpHint ? (
              <View style={styles.devBanner}>
                <Icon name="shield-check-outline" size={16} color="#1D4ED8" />
                <Text style={styles.devText}>
                  Dev Mode: Enter <Text style={{ fontWeight: '900' }}>{otpHint}</Text> to verify your account
                </Text>
              </View>
            ) : (
              <View style={[styles.devBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Icon name="check-circle-outline" size={16} color="#15803D" />
                <Text style={[styles.devText, { color: '#15803D' }]}>
                  A verification code has been sent to your registered phone number.
                </Text>
              </View>
            )}
            <Field label="OTP Code" icon="numeric"
              placeholder="Enter verification code"
              keyboardType="number-pad"
              value={otp} onChangeText={setOtp} maxLength={6} />

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle-outline" size={16} color={C.brand} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btnPrimary, (otp.length < 4 || loading) && { opacity: 0.5 }]}
              onPress={verifyRegistrationOtp}
              disabled={otp.length < 4 || loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Create Account</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={C.black} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Food Hunger App network</Text>

          <Text style={styles.sectionLabel}>I am a…</Text>
          <View style={styles.roleRow}>
            {ROLES.map(r => {
              const active = role === r.value;
              return (
                <TouchableOpacity key={r.value}
                  style={[styles.roleTile, active && { borderColor: r.color, borderWidth: 2 }]}
                  activeOpacity={0.7} onPress={() => setRole(r.value)}>
                  <View style={[styles.roleIcon, { backgroundColor: r.color + '18' }]}>
                    <Icon name={r.icon} size={22} color={r.color} />
                  </View>
                  <Text style={[styles.roleLabel, active && { color: r.color }]}>{r.label}</Text>
                  {active && <View style={[styles.roleDot, { backgroundColor: r.color }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Field label={role === 'ngo' ? 'NGO / Organisation name' : 'Full name'}
            icon="account-outline" placeholder="Enter your name"
            value={fullName} onChangeText={setFullName} />
          <Field label="Phone number" icon="phone-outline"
            placeholder="10-digit number (e.g. 9876543210)"
            keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <View style={{ position: 'relative' }}>
            <Field label="Password" icon="lock-outline"
              placeholder="Min. 6 characters" secureTextEntry={!showPwd}
              value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={styles.eyeBtn}>
              <Icon name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.grey2} />
            </TouchableOpacity>
          </View>

          {needsLocation && (
            <TouchableOpacity style={[styles.mapRow, selectedLocation && styles.mapRowDone]}
              activeOpacity={0.7} onPress={() => setShowMap(true)}>
              <Icon name={selectedLocation ? 'check-circle' : 'map-marker-outline'} size={22}
                color={selectedLocation ? C.green : C.grey2} />
              <Text style={[styles.mapText, selectedLocation && { color: C.green }]} numberOfLines={1}>
                {selectedLocation ? `Pinned: ${address}` : 'Pin your location (optional)'}
              </Text>
              <Icon name="chevron-right" size={18} color={C.grey3} />
            </TouchableOpacity>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color={C.brand} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btnPrimary, (!canSubmit || loading) && { opacity: 0.5 }]}
            onPress={submit} disabled={!canSubmit || loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={{ color: C.brand, fontWeight: '700' }}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <LocationPickerModal visible={showMap} onClose={() => setShowMap(false)}
        onSelectLocation={(loc) => {
          setSelectedLocation(loc);
          if (loc?.address) setAddress(loc.address);
          setShowMap(false);
        }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, flexGrow: 1 },
  back: { marginBottom: 24, alignSelf: 'flex-start' },
  title: { fontSize: F.h, fontWeight: '800', color: C.black },
  subtitle: { fontSize: F.sm, color: C.grey2, marginTop: 4, marginBottom: 28 },
  sectionLabel: { fontSize: F.sm, fontWeight: '600', color: C.grey1, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleTile: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: R.lg, borderWidth: 1, borderColor: C.divider, backgroundColor: '#FAFAFA', gap: 8, position: 'relative' },
  roleIcon: { width: 44, height: 44, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  roleLabel: { fontSize: F.sm, fontWeight: '700', color: C.grey1 },
  roleDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  eyeBtn: { position: 'absolute', right: 14, top: 38 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.divider, backgroundColor: C.surface, marginBottom: 16 },
  mapRowDone: { borderColor: C.green, backgroundColor: C.greenBg },
  mapText: { flex: 1, fontSize: F.sm, color: C.grey2, fontWeight: '500' },
  otpIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.brand + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  devBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', padding: 12, borderRadius: R.md, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  devText: { fontSize: F.sm, color: '#1D4ED8', flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF0F1', padding: 12, borderRadius: R.md, marginBottom: 16 },
  errorText: { fontSize: F.sm, color: C.brand, flex: 1 },
  btnPrimary: { height: 52, backgroundColor: C.brand, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: F.md, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  linkText: { fontSize: F.sm, color: C.grey2 },
});
