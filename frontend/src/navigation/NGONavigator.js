import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import NGOHome from '../screens/ngo/NGOHome';
import ClaimDonationScreen from '../screens/ngo/ClaimDonationScreen';
import NGOHubScreen from '../screens/ngo/NGOHubScreen';
import { buildTabConfig } from './tabConfig';

const Tab = createBottomTabNavigator();

const ICONS = {
  Donations: 'food-fork-drink',
  Claims:    'clipboard-check-outline',
  Hub:       'map-marker-star-outline',
};

export default function NGONavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...buildTabConfig(),
        tabBarIcon: ({ color, focused }) => (
          <Icon name={ICONS[route.name]} size={24} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Donations" component={NGOHome}           options={{ title: 'Food' }} />
      <Tab.Screen name="Claims"    component={ClaimDonationScreen} />
      <Tab.Screen name="Hub"       component={NGOHubScreen}      />
    </Tab.Navigator>
  );
}
