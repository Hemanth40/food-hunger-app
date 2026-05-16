import React, { useCallback, useContext, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import client from '../../api/client';
import DeliveryRouteMap from '../../components/DeliveryRouteMap';
import GlassCard from '../../components/GlassCard';
import ScreenShell from '../../components/ScreenShell';
import StatusChip from '../../components/StatusChip';
import { AuthContext } from '../../context/AuthContext';
import { useAppLayout } from '../../utils/layout';

function activeAction(item) {
  if (item.status === 'approved') return 'Reached Restaurant';
  if (item.status === 'driver_reached') return 'Confirm Picked Up';
  if (item.status === 'picked_up') return 'Mark delivered';
  return null;
}

function nextStatus(item) {
  if (item.status === 'approved') return 'driver_reached';
  if (item.status === 'driver_reached') return 'picked_up';
  if (item.status === 'picked_up') return 'delivered';
  return null;
}

export default function DriverMarketplaceScreen() {
  const { user } = useContext(AuthContext);
  const layout = useAppLayout();
  const [openJobs, setOpenJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const toArr = (d) => Array.isArray(d) ? d : (d?.items ?? d?.results ?? []);

  const loadData = async () => {
    const [openRes, myRes] = await Promise.all([
      client.get('/requests/driver/open'),
      client.get('/requests/driver/my'),
    ]);

    setOpenJobs(toArr(openRes.data));
    setMyJobs(toArr(myRes.data));
  };

  useFocusEffect(
    useCallback(() => {
      loadData().catch(() => {});
      const interval = setInterval(() => {
        loadData().catch(() => {});
      }, 10000); // 10s auto-polling
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const acceptJob = async (requestId) => {
    await client.post(`/requests/${requestId}/accept-driver`);
    await loadData();
  };

  const updateJobStatus = async (item) => {
    const status = nextStatus(item);
    if (!status) return;
    await client.put(`/requests/${item.id}/status`, { status });
    await loadData();
  };

  return (
    <ScreenShell
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.container}
    >
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>{user?.role === 'volunteer' ? 'Driver Marketplace' : 'Driver Board'}</Text>
        <Text style={styles.headerSubtitle}>Accept live rescue routes and keep food moving.</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My active runs</Text>
        <StatusChip tone="driver" label={`${myJobs.length} active`} />
      </View>

      {myJobs.length ? (
        myJobs.map((item) => {
          // Dynamic map logic based on status
          let mapPickup, mapDropoff;
          if (item.status === 'approved') {
            // Volunteer -> Restaurant (For now, we just point to the Restaurant)
            mapPickup = null; // Can be volunteer's location if available
            mapDropoff = {
              latitude: item.donation_latitude,
              longitude: item.donation_longitude,
            };
          } else {
            // Restaurant -> NGO
            mapPickup = {
              latitude: item.donation_latitude,
              longitude: item.donation_longitude,
            };
            mapDropoff = {
              latitude: item.receiver_latitude,
              longitude: item.receiver_longitude,
            };
          }

          return (
          <DeliveryRouteMap
            key={item.id}
            pickup={mapPickup}
            dropoff={mapDropoff}
            title={item.donation_food_type}
            subtitle={`${item.donor_name} to ${item.receiver_name}`}
            statusTone={item.status}
            statusLabel={item.status}
            actionLabel={activeAction(item)}
            onActionPress={() => updateJobStatus(item)}
            compact
            pickupLabel={item.donor_name || 'Pickup'}
            dropoffLabel={item.receiver_name || 'NGO hub'}
          />
          );
        })
      ) : (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No active route yet</Text>
          <Text style={styles.emptyBody}>
            Accept an open delivery below and it will instantly appear in your live route board.
          </Text>
        </GlassCard>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Open delivery jobs</Text>
        <Text style={styles.sectionMeta}>{openJobs.length} waiting</Text>
      </View>

      {openJobs.length ? (
        openJobs.map((item) => (
          <GlassCard key={item.id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View style={styles.jobCopy}>
                <Text style={styles.jobTitle}>{item.donation_food_type}</Text>
                <Text style={styles.jobSubtitle}>
                  {item.donor_name} to {item.receiver_name}
                </Text>
              </View>
              <StatusChip tone="driver" label="Driver needed" />
            </View>

            <View style={styles.metaRow}>
              <Icon name="map-marker-outline" size={18} color="#8E8E93" />
              <Text style={styles.jobMeta}>{item.donation_pickup_address}</Text>
            </View>

            <DeliveryRouteMap
              pickup={{
                latitude: item.donation_latitude,
                longitude: item.donation_longitude,
              }}
              dropoff={{
                latitude: item.receiver_latitude,
                longitude: item.receiver_longitude,
              }}
              title="Dispatch preview"
              subtitle={`${item.donor_name} pickup to NGO hub`}
              statusTone="driver"
              statusLabel={item.delivery_mode || 'driver'}
              compact
              pickupLabel={item.donor_name || 'Pickup'}
              dropoffLabel={item.receiver_name || 'NGO hub'}
            />
            <Button
              mode="contained"
              buttonColor="#1C1C1E"
              textColor="#FFFFFF"
              style={styles.acceptButton}
              contentStyle={styles.acceptButtonContent}
              onPress={() => acceptJob(item.id)}
            >
              Accept this route
            </Button>
          </GlassCard>
        ))
      ) : (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No open routes right now</Text>
          <Text style={styles.emptyBody}>
            Pull to refresh when new rescue jobs arrive.
          </Text>
        </GlassCard>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  headerArea: {
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#636366',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  sectionMeta: {
    color: '#8E8E93',
    fontWeight: '600',
  },
  emptyCard: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  emptyBody: {
    marginTop: 8,
    color: '#636366',
    lineHeight: 22,
  },
  jobCard: {
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobCopy: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  jobSubtitle: {
    marginTop: 4,
    color: '#636366',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  jobMeta: {
    flex: 1,
    color: '#3A3A3C',
    lineHeight: 20,
  },
  acceptButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  acceptButtonContent: {
    height: 48,
  },
});
