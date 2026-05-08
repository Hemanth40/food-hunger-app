import React, { useContext } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AuthContext } from '../context/AuthContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import NGONavigator from './NGONavigator';
import RestaurantNavigator from './RestaurantNavigator';
import VolunteerNavigator from './VolunteerNavigator';
import LiveTrackerScreen from '../screens/shared/LiveTrackerScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF6A3D" />
        <Text style={styles.loaderText}>Loading your rescue workspace...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleTabs">
        {() => {
          if (user.role === 'ngo') return <NGONavigator />;
          if (user.role === 'volunteer') return <VolunteerNavigator />;
          return <RestaurantNavigator />;
        }}
      </Stack.Screen>
      <Stack.Screen name="LiveTracker" component={LiveTrackerScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EFE7',
  },
  loaderText: {
    marginTop: 12,
    color: '#5E6978',
    fontWeight: '700',
  },
});
