import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import VolunteerHome from '../screens/volunteer/VolunteerHome';
import DriverMarketplaceScreen from '../screens/shared/DriverMarketplaceScreen';
import MapScreen from '../screens/volunteer/MapScreen';
import MLHotspotsScreen from '../screens/volunteer/MLHotspotsScreen';
import { buildTabConfig } from './tabConfig';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home:     'home-outline',
  Jobs:     'briefcase-search-outline',
  Route:    'map-marker-path',
  Hotspots: 'radar',
};

export default function VolunteerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...buildTabConfig(),
        tabBarIcon: ({ color }) => (
          <Icon name={ICONS[route.name]} size={24} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home"     component={VolunteerHome} />
      <Tab.Screen name="Jobs"     component={DriverMarketplaceScreen} />
      <Tab.Screen name="Route"    component={MapScreen} />
      <Tab.Screen name="Hotspots" component={MLHotspotsScreen} />
    </Tab.Navigator>
  );
}
