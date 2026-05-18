import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, RefreshControl, StyleSheet, StatusBar, FlatList, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import client from '../../api/client';
import { C, F, R, shadow } from '../../theme';

const STATUS_COLOR = {
  available: C.green,
  claimed:   '#F59E0B',
  delivered: '#2563EB',
  expired:   C.grey3,
};

export default function NGOHome() {
  const { user, logout } = useContext(AuthContext);
  const [donations, setDonations]       = useState([]);
  const [refreshing, setRefreshing]     = useState(false);

  const toArray = (data) => Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.donations ?? []);

  const loadData = async () => {
    try {
      const res = await client.get('/donations/?status=available&limit=50');
      setDonations(toArray(res.data));
    } catch (e) {
      // If the main endpoint fails, show empty list — don't blank screen
      console.warn('[NGOHome] Failed to load donations:', e?.message);
      setDonations([]);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [user?.latitude, user?.longitude]));
  const onRefresh = async () => { setRefreshing(true); await loadData().catch(() => {}); setRefreshing(false); };

  const claimFood = async (id) => {
    await client.post('/requests/claim', { donation_id: id });
    await loadData();
  };

  const available = donations.filter(d => d.status === 'available' || !d.status);
  const all = donations;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>NGO Dashboard 🏠</Text>
          <Text style={styles.sub}>{available.length} available donations</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'N'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── LIST VIEW ── */}
      <FlatList
          data={all}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <Icon name="food-off" size={48} color={C.grey3} />
              <Text style={styles.listEmptyText}>No donations right now. Pull to refresh.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Status strip */}
              <View style={[styles.statusStrip, { backgroundColor: STATUS_COLOR[item.status] || C.brand }]} />
              <View style={styles.cardBody}>

                <View style={styles.cardTop}>
                  <View style={styles.foodBadge}>
                    <Icon name="food-fork-drink" size={22} color={C.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.food_type}</Text>
                    <Text style={styles.cardRestaurant} numberOfLines={1}>
                      {item.donor_name || `Donor #${item.donor_id}`}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: (STATUS_COLOR[item.status] || C.brand) + '20' }]}>
                    <Text style={[styles.pillText, { color: STATUS_COLOR[item.status] || C.brand }]}>
                      {item.status || 'available'}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Icon name="account-group-outline" size={14} color={C.grey2} />
                  <Text style={styles.metaText}>Feeds ~{item.quantity} people</Text>
                  {item.distance_km != null && (
                    <>
                      <Icon name="map-marker-distance" size={14} color={C.grey2} />
                      <Text style={styles.metaText}>{item.distance_km} km away</Text>
                    </>
                  )}
                </View>

                {item.latitude && item.longitude && (
                  <TouchableOpacity
                    style={styles.mapsBtn}
                    onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`)}
                  >
                    <Icon name="map-marker-outline" size={14} color="#2563EB" />
                    <Text style={styles.mapsBtnText}>
                      {item.pickup_address ? item.pickup_address : `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
                    </Text>
                    <Icon name="open-in-new" size={12} color="#2563EB" />
                  </TouchableOpacity>
                )}

                {(item.status === 'available' || !item.status) && (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    activeOpacity={0.8}
                    onPress={() => claimFood(item.id)}
                  >
                    <Icon name="check-circle-outline" size={18} color="#fff" />
                    <Text style={styles.claimBtnText}>Claim This Donation</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F6F6' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  greeting: { fontSize: F.lg, fontWeight: '800', color: C.black },
  sub: { fontSize: F.xs, color: C.grey2, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  toggleBtn: {
    width: 32, height: 32, borderRadius: R.sm,
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  toggleActive: { backgroundColor: C.brand },
  avatarBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.green, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: F.sm },


  // List
  list: { padding: 12, paddingBottom: 100, gap: 12 },
  listEmpty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  listEmptyText: { fontSize: F.md, color: C.grey2, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: R.lg, flexDirection: 'row',
    overflow: 'hidden', ...shadow,
  },
  statusStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  foodBadge: {
    width: 42, height: 42, borderRadius: R.md,
    backgroundColor: C.brandBg, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: F.md, fontWeight: '700', color: C.black },
  cardRestaurant: { fontSize: F.xs, color: C.grey2, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.full },
  pillText: { fontSize: F.xs, fontWeight: '700', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  metaText: { fontSize: F.xs, color: C.grey2, flex: 1 },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: R.sm, padding: 8,
    borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 8,
  },
  mapsBtnText: { flex: 1, fontSize: F.xs, color: '#2563EB', fontWeight: '600' },
  claimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.green, borderRadius: R.md, height: 42, marginTop: 4,
  },
  claimBtnText: { color: '#fff', fontWeight: '700', fontSize: F.sm },
});
