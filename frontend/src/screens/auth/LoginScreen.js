import React, { useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../context/AuthContext';
import Field from '../../components/Field';
import { C, F, R } from '../../theme';
import { extractError } from '../../utils/errorUtils';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) return;
    try {
      setLoading(true); setError('');
      await login(phone, password);
      // AuthContext sets user → App.js navigator switches to Home automatically
    } catch (err) {
      setError(extractError(err));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={C.black} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>Sign in to continue helping</Text>
          </View>

          <Field
            label="Phone number"
            icon="phone-outline"
            placeholder="Enter your phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <View style={{ position: 'relative' }}>
            <Field
              label="Password"
              icon="lock-outline"
              placeholder="Enter your password"
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={styles.eyeBtn}>
              <Icon name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.grey2} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color={C.brand} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btnPrimary, (!phone || !password || loading) && { opacity: 0.5 }]}
            onPress={handleLogin}
            disabled={!phone || !password || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>New here? <Text style={{ color: C.brand, fontWeight: '700' }}>Create account</Text></Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, flexGrow: 1 },
  back: { marginBottom: 28, alignSelf: 'flex-start' },
  header: { marginBottom: 32 },
  title: { fontSize: F.h, fontWeight: '800', color: C.black },
  subtitle: { fontSize: F.sm, color: C.grey2, marginTop: 6, lineHeight: 20 },
  eyeBtn: { position: 'absolute', right: 14, top: 38 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF0F1', padding: 12,
    borderRadius: R.md, marginBottom: 16,
  },
  errorText: { fontSize: F.sm, color: C.brand, flex: 1 },
  btnPrimary: {
    height: 52, backgroundColor: C.brand, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: F.md, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  linkText: { fontSize: F.sm, color: C.grey2 },
});
