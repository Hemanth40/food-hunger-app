import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import AuraBackground from '../../components/AuraBackground';

export default function LiveTrackerScreen({ navigation }) {
  return (
    <AuraBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            iconColor="#fff"
            containerColor="rgba(0,0,0,0.5)"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text variant="titleMedium" style={styles.headerText}>Order Status</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.center}>
          <BlurView intensity={100} tint="dark" style={styles.card}>
             <IconButton icon="cellphone" size={50} iconColor="#FF6A3D" />
             <Text style={styles.title}>Map Only Available on Mobile</Text>
             <Text style={styles.subText}>
               Live GPS Tracking relies on native iOS and Android Map APIs.
               Please open the native mobile app to view the live animated driver route.
             </Text>
          </BlurView>
        </View>

      </View>
    </AuraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 30,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  headerText: { color: '#fff', fontWeight: 'bold' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden'
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  }
});
