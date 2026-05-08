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

const STATUS_COLOR = { approved:'#2563EB', picked_up:'#8B5CF6', delivered:C.green };

export default function DispatchCenterScreen({ navigation }) {
  const [dispatches, setDispatches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const res = await client.get('/requests/donor/dispatches');
    setDispatches(res.data);
  };

  useFocusEffect(useCallback(() => { loadData().catch(() => {}); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadData().catch(() => {}); setRefreshing(false); };

  const selfDeliver = async (id) => {
    await client.post(`/requests/${id}/self-deliver`);
    await loadData();
  };

  const advance = async (item) => {
    const next = item.status === 'approved' ? 'picked_up' : item.status === 'picked_up' ? 'delivered' : null;
    if (!next) return;
    await client.put(`/requests/${item.id}/status`, { status: next });
    await loadData();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch Center</Text>
        <Text style={styles.sub}>{dispatches.length} active routes</Text>
      </View>

      <FlatList
        data={dispatches}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="truck-outline" size={48} color={C.grey3} />
            <Text style={styles.emptyTitle}>No dispatches yet</Text>
            <Text style={styles.emptySub}>Once NGOs claim your food, routes will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = STATUS_COLOR[item.status] || C.grey3;
          const driverLabel = item.assigned_driver_name
            ? `Driver: ${item.assigned_driver_name}`
            : item.delivery_mode === 'self' ? 'Self delivery'
            : item.delivery_mode === 'driver' ? 'Waiting for driver'
            : 'Flexible';

          const nextLabel = item.status === 'approved' ? 'Mark Picked Up'
            : item.status === 'picked_up' ? 'Mark Delivered'
            : null;

          return (
            <View style={styles.card}>
              <View style={[styles.strip, { backgroundColor: color }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
                    <Icon name="truck-fast-outline" size={22} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.donation_food_type}</Text>
                    <Text style={styles.cardSub}>To: {item.receiver_name || 'NGO Hub'}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.pillText, { color }]}>{item.status?.replace('_', ' ')}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="motorbike" size={14} color={C.grey2} />
                  <Text style={styles.infoText}>{driverLabel}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="account-group-outline" size={14} color={C.grey2} />
                  <Text style={styles.infoText}>{item.donation_quantity} people</Text>
                </View>

                <View style={styles.btnRow}>
                  {item.delivery_mode === 'flex' && !item.assigned_driver_id && (
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#EEF2FF', flex: 1 }]} onPress={() => selfDeliver(item.id)}>
                      <Icon name="account-arrow-right" size={15} color="#2563EB" />
                      <Text style={[styles.btnText, { color: '#2563EB' }]}>I will deliver</Text>
                    </TouchableOpacity>
                  )}
                  {nextLabel && item.delivery_mode === 'self' && (
                    <TouchableOpacity style={[styles.btn, { backgroundColor: color + '18', flex: 1 }]} onPress={() => advance(item)}>
                      <Icon name="arrow-right-circle-outline" size={15} color={color} />
                      <Text style={[styles.btnText, { color }]}>{nextLabel}</Text>
                    </TouchableOpacity>
                  )}
                  {/* Track Order Button injected here */}
                  <TouchableOpacity 
                      style={[styles.btn, { backgroundColor: '#FF6B0020', flex: 1 }]} 
                      onPress={() => navigation.navigate('LiveTracker', {
                          donationId: item.id,
                          status: item.delivery_mode === 'self' ? 'self_delivery_active' : item.status,
                          restaurantLocation: { latitude: 12.9716, longitude: 77.5946 }, // Mock coords
                          restaurantName: "My Restaurant",
                          ngoLocation: { latitude: 12.9800, longitude: 77.6000 },
                          ngoName: item.receiver_name || "NGO Hub",
                          volunteerName: item.assigned_driver_name
                      })}
                  >
                    <Icon name="map-marker-path" size={15} color="#FF6B00" />
                    <Text style={[styles.btnText, { color: '#FF6B00' }]}>Track Map</Text>
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
  pill:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.full },
  pillText: { fontSize: F.xs, fontWeight: '700', textTransform: 'capitalize' },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { fontSize: F.xs, color: C.grey2, flex: 1 },
  btnRow:   { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 38, borderRadius: R.md },
  btnText:  { fontSize: F.sm, fontWeight: '700' },
});
