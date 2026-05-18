import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  RefreshControl, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { C, F, R, shadow } from '../../theme';

const STATUS_COLOR  = { pending:'#F59E0B', approved:'#2563EB', driver_reached:'#F59E0B', picked_up:'#8B5CF6', delivered:C.green, cancelled:C.grey3 };
const STATUS_ICON   = { pending:'clock-outline', approved:'check', driver_reached:'truck-fast-outline', picked_up:'package-up', delivered:'check-circle', cancelled:'close-circle' };

export default function ClaimDonationScreen({ navigation }) {
  const [claims, setClaims]     = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const res = await client.get('/requests/my');
    setClaims(res.data);
  };

  useFocusEffect(useCallback(() => {
    loadData().catch(() => {});
    const interval = setInterval(() => { loadData().catch(() => {}); }, 10000);
    return () => clearInterval(interval);
  }, []));
  const onRefresh = async () => { setRefreshing(true); await loadData().catch(() => {}); setRefreshing(false); };

  const confirmDelivered = async (id) => {
    await client.put(`/requests/${id}/status`, { status: 'delivered' });
    await loadData();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>My Claims</Text>
        <Text style={styles.sub}>{claims.length} total requests</Text>
      </View>

      <FlatList
        data={claims}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="clipboard-text-off-outline" size={48} color={C.grey3} />
            <Text style={styles.emptyTitle}>No claims yet</Text>
            <Text style={styles.emptySub}>Claim food from the Donations tab to see it here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = STATUS_COLOR[item.status] || C.grey3;
          const icon  = STATUS_ICON[item.status]  || 'help-circle';
          return (
            <View style={styles.card}>
              <View style={[styles.strip, { backgroundColor: color }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
                    <Icon name="food-fork-drink" size={22} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.donation_food_type || 'Food Donation'}</Text>
                    <Text style={styles.cardSub}>From {item.donor_name || `Donor #${item.donor_id}`}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: color + '18' }]}>
                    <Icon name={icon} size={12} color={color} />
                    <Text style={[styles.pillText, { color }]}>
                      {item.status === 'approved' && !item.assigned_driver_id && item.delivery_mode !== 'self' ? 'Pending Driver' : item.status?.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="account-group-outline" size={14} color={C.grey2} />
                  <Text style={styles.infoText}>Feeds ~{item.donation_quantity || '?'} people</Text>
                </View>

                {/* Driver info row */}
                {item.assigned_driver_name ? (
                  <View style={styles.infoRow}>
                    <Icon name="motorbike" size={14} color={C.grey2} />
                    <Text style={styles.infoText}>Driver: {item.assigned_driver_name}</Text>
                  </View>
                ) : item.delivery_mode === 'self' ? (
                  <View style={styles.infoRow}>
                    <Icon name="walk" size={14} color={C.grey2} />
                    <Text style={styles.infoText}>Self delivery by restaurant</Text>
                  </View>
                ) : (
                  <View style={styles.infoRow}>
                    <Icon name="account-search-outline" size={14} color="#F59E0B" />
                    <Text style={[styles.infoText, { color: '#F59E0B' }]}>Waiting for a driver...</Text>
                  </View>
                )}

                {item.donation_pickup_address ? (
                  <View style={styles.infoRow}>
                    <Icon name="map-marker-outline" size={14} color={C.grey2} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.donation_pickup_address}</Text>
                  </View>
                ) : null}

                {item.status === 'picked_up' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.green }]} onPress={() => confirmDelivered(item.id)}>
                    <Icon name="check-circle-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Confirm Received</Text>
                  </TouchableOpacity>
                )}

                {/* Track Map button — always visible for NGO */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => navigation.navigate('LiveTracker', {
                      requestId: item.id,
                      donationId: item.donation_id,
                      status: item.status,
                      restaurantLocation: {
                        latitude: item.donation_latitude || 12.9716,
                        longitude: item.donation_longitude || 77.5946,
                      },
                      restaurantName: item.donor_name || 'Restaurant',
                      ngoLocation: {
                        latitude: item.receiver_latitude || 12.9800,
                        longitude: item.receiver_longitude || 77.6000,
                      },
                      ngoName: 'My NGO',
                      volunteerName: item.assigned_driver_name,
                    })}
                  >
                    <Icon name="map-marker-path" size={15} color="#FF6B00" />
                    <Text style={styles.trackBtnText}>Track Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F6F6' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  title: { fontSize: F.xl, fontWeight: '800', color: C.black },
  sub:   { fontSize: F.xs, color: C.grey2, marginTop: 2 },
  list:  { padding: 14, paddingBottom: 100, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: F.lg, fontWeight: '700', color: C.black },
  emptySub:   { fontSize: F.sm, color: C.grey2, textAlign: 'center' },

  card: { backgroundColor: '#fff', borderRadius: R.lg, flexDirection: 'row', overflow: 'hidden', ...shadow },
  strip: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBox:  { width: 42, height: 42, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle:{ fontSize: F.md, fontWeight: '700', color: C.black },
  cardSub:  { fontSize: F.xs, color: C.grey2, marginTop: 2 },
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.full },
  pillText: { fontSize: F.xs, fontWeight: '700', textTransform: 'capitalize' },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { fontSize: F.xs, color: C.grey2, flex: 1 },
  actionBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: R.md, marginTop: 8 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: F.sm },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  trackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 38, borderRadius: R.md,
    backgroundColor: '#FF6B0018',
  },
  trackBtnText: { color: '#FF6B00', fontWeight: '700', fontSize: F.sm },
});
