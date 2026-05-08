import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, RefreshControl, StyleSheet, StatusBar, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import client from '../../api/client';
import { C, F, R, shadow } from '../../theme';

export default function VolunteerHome({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile]       = useState({});
  const [myJobs, setMyJobs]         = useState([]);
  const [isOnline, setIsOnline]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [profileRes, jobsRes] = await Promise.all([
      client.get('/volunteers/profile'),
      client.get('/requests/driver/my'),
    ]);
    setProfile(profileRes.data);
    setIsOnline(profileRes.data.availability_status);
    setMyJobs(jobsRes.data);
  };

  useFocusEffect(useCallback(() => { loadData().catch(() => {}); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadData().catch(() => {}); setRefreshing(false); };

  const toggleOnline = async (val) => {
    setIsOnline(val);
    try { await client.put('/volunteers/availability', { availability_status: val }); }
    catch { setIsOnline(!val); }
  };

  const activeJob = myJobs[0];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.full_name?.split(' ')[0]} 👋</Text>
            <Text style={styles.role}>Volunteer Driver</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'V'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Online toggle card ── */}
        <View style={[styles.onlineCard, isOnline && styles.onlineCardActive]}>
          <View style={styles.onlineLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? C.green : C.grey3 }]} />
            <View>
              <Text style={styles.onlineTitle}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
              <Text style={styles.onlineSub}>
                {isOnline ? 'Ready to receive delivery jobs' : 'Toggle to start accepting jobs'}
              </Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: C.divider, true: C.green + '80' }}
            thumbColor={isOnline ? C.green : '#ccc'}
          />
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatCard icon="truck-check-outline" value={profile.total_deliveries || 0} label="Deliveries" color={C.brand} />
          <StatCard icon="star-circle-outline" value={profile.rating?.toFixed(1) || '5.0'} label="Rating" color="#F59E0B" />
          <StatCard icon="briefcase-check-outline" value={myJobs.length} label="Active" color={C.green} />
        </View>

        {/* ── Active job ── */}
        {activeJob ? (
          <>
            <Text style={styles.sectionTitle}>Current Delivery</Text>
            <TouchableOpacity
              style={styles.activeJobCard}
              activeOpacity={0.85}
              onPress={() => {
                // Navigate to the full-screen live WebView map tracker
                navigation.navigate('LiveTracker', {
                  requestId: activeJob.id,
                  donationId: activeJob.donation_id,
                  status: activeJob.status || 'accepted',
                  restaurantLocation: {
                    latitude:  activeJob.donation_latitude  ?? 12.9716,
                    longitude: activeJob.donation_longitude ?? 77.5946,
                  },
                  restaurantName: activeJob.donor_name || 'Restaurant',
                  ngoLocation: {
                    latitude:  activeJob.receiver_latitude  ?? 12.9800,
                    longitude: activeJob.receiver_longitude ?? 77.6000,
                  },
                  ngoName: activeJob.receiver_name || 'NGO Hub',
                  volunteerName: null,
                });
              }}
            >
              <View style={styles.activeJobHeader}>
                <View style={styles.liveChip}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={styles.activeJobFood}>{activeJob.donation_food_type}</Text>
              </View>
              <View style={styles.journey}>
                <JourneyStop dot="#F59E0B" label="FROM" name={activeJob.donor_name || 'Restaurant'} />
                <View style={styles.journeyArrow}>
                  <Icon name="arrow-down" size={18} color={C.grey3} />
                </View>
                <JourneyStop dot={C.green} label="TO" name={activeJob.receiver_name || 'NGO Hub'} />
              </View>
              <View style={styles.openMapRow}>
                <Text style={styles.openMapText}>Tap to open live map</Text>
                <Icon name="chevron-right" size={18} color={C.brand} />
              </View>
            </TouchableOpacity>
          </>

        ) : (
          <>
            <Text style={styles.sectionTitle}>No Active Delivery</Text>
            <View style={styles.noJobCard}>
              <Icon name="map-search-outline" size={40} color={C.grey3} />
              <Text style={styles.noJobTitle}>Ready to deliver?</Text>
              <Text style={styles.noJobSub}>Browse open jobs and accept one to start your route.</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate('Jobs')}
              >
                <Icon name="briefcase-search-outline" size={16} color="#fff" />
                <Text style={styles.browseBtnText}>Browse Jobs</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Past jobs ── */}
        {myJobs.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Recent History</Text>
            {myJobs.slice(1, 4).map(job => (
              <View key={job.id} style={styles.historyCard}>
                <View style={[styles.historyDot, { backgroundColor: job.status === 'delivered' ? C.green : C.grey3 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyFood}>{job.donation_food_type}</Text>
                  <Text style={styles.historySub}>{job.receiver_name || 'NGO Hub'} • {job.status}</Text>
                </View>
                <Icon name={job.status === 'delivered' ? 'check-circle' : 'clock-outline' } size={18} color={job.status === 'delivered' ? C.green : C.grey3} />
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <View style={[styles.stat, { borderTopColor: color }]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function JourneyStop({ dot, label, name }) {
  return (
    <View style={styles.journeyStop}>
      <View style={[styles.journeyDot, { backgroundColor: dot }]} />
      <View>
        <Text style={styles.journeyLabel}>{label}</Text>
        <Text style={styles.journeyName}>{name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F6F6' },
  content: { padding: 20, paddingBottom: 100 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: F.xl, fontWeight: '800', color: C.black },
  role:     { fontSize: F.sm, color: C.grey2, marginTop: 2 },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: F.md },

  onlineCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: R.lg, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: C.divider, ...shadow,
  },
  onlineCardActive: { borderColor: C.green + '50', backgroundColor: '#F0FFF6' },
  onlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  onlineTitle: { fontSize: F.md, fontWeight: '700', color: C.black },
  onlineSub: { fontSize: F.xs, color: C.grey2, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  stat: {
    flex: 1, backgroundColor: '#fff', borderRadius: R.md,
    padding: 12, alignItems: 'center', gap: 4,
    borderTopWidth: 3, ...shadow,
  },
  statValue: { fontSize: F.xl, fontWeight: '800', color: C.black },
  statLabel: { fontSize: F.xs, color: C.grey2, fontWeight: '600' },

  sectionTitle: { fontSize: F.md, fontWeight: '700', color: C.black, marginBottom: 12 },

  // Active job card
  activeJobCard: {
    backgroundColor: '#fff', borderRadius: R.lg, padding: 16, marginBottom: 20,
    borderWidth: 1.5, borderColor: C.brand + '40', ...shadow,
  },
  activeJobHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.brand + '18', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: R.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.brand },
  liveText: { fontSize: F.xs, fontWeight: '800', color: C.brand, letterSpacing: 1 },
  activeJobFood: { fontSize: F.md, fontWeight: '700', color: C.black, flex: 1 },
  journey: { gap: 4, marginBottom: 12 },
  journeyArrow: { paddingLeft: 14 },
  journeyStop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  journeyDot: { width: 12, height: 12, borderRadius: 6 },
  journeyLabel: { fontSize: F.xs, fontWeight: '700', color: C.grey3, letterSpacing: 0.5 },
  journeyName: { fontSize: F.sm, fontWeight: '600', color: C.black },
  openMapRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: C.divider,
  },
  openMapText: { fontSize: F.sm, color: C.brand, fontWeight: '600' },

  // No job card
  noJobCard: {
    backgroundColor: '#fff', borderRadius: R.lg, padding: 28,
    alignItems: 'center', gap: 8, marginBottom: 20, ...shadow,
  },
  noJobTitle: { fontSize: F.lg, fontWeight: '700', color: C.black },
  noJobSub: { fontSize: F.sm, color: C.grey2, textAlign: 'center', lineHeight: 20 },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.brand, paddingHorizontal: 20, paddingVertical: 11,
    borderRadius: R.md, marginTop: 8,
  },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: F.sm },

  // History
  historyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: R.md, padding: 14,
    marginBottom: 10, ...shadow,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyFood: { fontSize: F.sm, fontWeight: '600', color: C.black },
  historySub: { fontSize: F.xs, color: C.grey2, marginTop: 2, textTransform: 'capitalize' },
});
