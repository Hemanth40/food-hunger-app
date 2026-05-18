import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, RefreshControl, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import client from '../../api/client';
import Card from '../../components/Card';
import { C, F, R } from '../../theme';

const STATUS_COLOR = {
  available: C.green,
  claimed:   '#F59E0B',
  delivered: '#2563EB',
  expired:   C.grey3,
};

export default function RestaurantHome({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [donations, setDonations]   = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [stats, setStats]           = useState({ total_donations: 0, total_delivered: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [historyRes, statsRes, dispatchRes] = await Promise.allSettled([
      client.get('/donations/my/history'),
      client.get('/donations/my/stats'),
      client.get('/requests/donor/dispatches'),
    ]);
    if (historyRes.status === 'fulfilled') setDonations(historyRes.value.data);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    if (dispatchRes.status === 'fulfilled') setDispatches(dispatchRes.value.data);
  };

  useFocusEffect(useCallback(() => { loadData().catch(() => {}); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadData().catch(() => {}); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0]} 👋</Text>
            <Text style={styles.role}>Donor Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'D'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBadge icon="food" label="Donations" value={stats.total_donations || 0} color={C.brand} />
          <StatBadge icon="truck-check-outline" label="Delivered" value={stats.total_delivered || 0} color={C.green} />
          <StatBadge icon="fire" label="Live" value={dispatches.length} color="#F59E0B" />
        </View>

        {/* Active dispatches */}
        {dispatches.length > 0 && (
          <>
            <SectionTitle title="Active Dispatches" count={dispatches.length} />
            {dispatches.slice(0, 2).map(item => (
              <Card key={item.id} style={styles.dispatchCard}>
                <View style={styles.dispatchHeader}>
                  <View style={styles.foodBadge}>
                    <Icon name="food-fork-drink" size={18} color={C.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.donation_food_type}</Text>
                    <Text style={styles.cardSub}>To {item.receiver_name || 'NGO hub'}</Text>
                  </View>
                  <StatusPill status={item.status || 'claimed'} />
                </View>
                <View style={styles.infoRow}>
                  <Icon name="map-marker-outline" size={14} color={C.grey2} />
                  <Text style={styles.infoText}>{item.donation_pickup_address || 'Pickup location'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="motorbike" size={14} color={C.grey2} />
                  <Text style={styles.infoText}>
                    {item.assigned_driver_name ? `Driver: ${item.assigned_driver_name}` : 'Waiting for driver'}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Recent donations */}
        <SectionTitle title="Recent Donations" count={donations.length} />
        {donations.length === 0 ? (
          <EmptyState icon="food-off" message="No donations yet. Tap + to post food." />
        ) : (
          donations.map(item => (
            <Card key={item.id} style={styles.donationCard}>
              <View style={styles.dispatchHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.food_type}</Text>
                  <Text style={styles.cardSub}>Feeds ~{item.quantity} people</Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <View style={styles.infoRow}>
                <Icon name="clock-outline" size={14} color={C.grey2} />
                <Text style={styles.infoText}>Expires {new Date(item.expires_at).toLocaleTimeString()}</Text>
              </View>
            </Card>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatBadge({ icon, label, value, color }) {
  return (
    <View style={[styles.stat, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, count }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && <Text style={styles.sectionCount}>{count}</Text>}
    </View>
  );
}

function StatusPill({ status }) {
  const color = STATUS_COLOR[status] || C.grey3;
  return (
    <View style={[styles.pill, { backgroundColor: color + '20' }]}>
      <Text style={[styles.pillText, { color }]}>{status}</Text>
    </View>
  );
}

function EmptyState({ icon, message }) {
  return (
    <Card style={styles.empty}>
      <Icon name={icon} size={40} color={C.grey3} style={{ alignSelf: 'center', marginBottom: 8 }} />
      <Text style={styles.emptyText}>{message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 100 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: F.xl, fontWeight: '800', color: C.black },
  role: { fontSize: F.sm, color: C.grey2, marginTop: 2 },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: F.md },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  stat: {
    flex: 1, borderRadius: R.md, backgroundColor: C.surface,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: C.divider,
  },
  statValue: { fontSize: F.xl, fontWeight: '800', color: C.black },
  statLabel: { fontSize: F.xs, color: C.grey2, fontWeight: '600' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: F.lg, fontWeight: '700', color: C.black },
  sectionCount: {
    fontSize: F.xs, fontWeight: '700', color: C.brand,
    backgroundColor: C.brandBg, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: R.full,
  },

  dispatchCard: { marginBottom: 12 },
  donationCard: { marginBottom: 12 },
  dispatchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  foodBadge: {
    width: 38, height: 38, borderRadius: R.md,
    backgroundColor: C.brandBg, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: F.md, fontWeight: '700', color: C.black },
  cardSub: { fontSize: F.sm, color: C.grey2, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  infoText: { fontSize: F.sm, color: C.grey2, flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full },
  pillText: { fontSize: F.xs, fontWeight: '700', textTransform: 'capitalize' },

  empty: { alignItems: 'center', padding: 28 },
  emptyText: { fontSize: F.sm, color: C.grey2, textAlign: 'center', lineHeight: 20, marginTop: 4 },
});
