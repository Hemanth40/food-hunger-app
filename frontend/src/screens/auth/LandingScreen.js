import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { C, F, R } from '../../theme';

export default function LandingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Icon name="food-apple" size={36} color="#fff" />
          </View>
          <Text style={styles.appName}>Food Hunger App</Text>
          <Text style={styles.tagline}>Fighting hunger, reducing waste</Text>
        </View>

        {/* Role tiles */}
        <View style={styles.tiles}>
          <RoleTile icon="store" color="#E23744" label="Restaurant / Donor" desc="Post surplus food instantly" />
          <RoleTile icon="home-group" color="#29A764" label="NGO" desc="Find food for your community" />
          <RoleTile icon="motorbike" color="#2563EB" label="Volunteer" desc="Deliver food, earn impact" />
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnGhostText}>Already have an account? <Text style={{ color: C.brand, fontWeight: '700' }}>Log In</Text></Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

function RoleTile({ icon, color, label, desc }) {
  const bg = color + '15';
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.tileCopy}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },

  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  appName: { fontSize: F.h, fontWeight: '800', color: C.black },
  tagline: { fontSize: F.sm, color: C.grey2, marginTop: 4 },

  tiles: { gap: 14, marginBottom: 40 },
  tile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: R.lg,
    backgroundColor: '#FAFAFA',
    borderWidth: 1, borderColor: C.divider,
  },
  tileIcon: {
    width: 46, height: 46, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center',
  },
  tileCopy: { flex: 1 },
  tileLabel: { fontSize: F.md, fontWeight: '700', color: C.black },
  tileDesc: { fontSize: F.sm, color: C.grey2, marginTop: 2 },

  cta: { gap: 12 },
  btnPrimary: {
    height: 52, borderRadius: R.md, backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: F.md, fontWeight: '700' },
  btnGhost: { alignItems: 'center', paddingVertical: 10 },
  btnGhostText: { fontSize: F.sm, color: C.grey2 },
});
