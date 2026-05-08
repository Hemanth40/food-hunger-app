import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { AuthContext } from '../context/AuthContext';
import RestaurantHome from '../screens/restaurant/RestaurantHome';
import CreateDonationScreen from '../screens/restaurant/CreateDonationScreen';
import DispatchCenterScreen from '../screens/restaurant/DispatchCenterScreen';
import DriverMarketplaceScreen from '../screens/shared/DriverMarketplaceScreen';
import { buildTabConfig } from './tabConfig';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home:     'view-dashboard-outline',
  Donate:   'plus-circle-outline',
  Dispatch: 'truck-fast-outline',
  Drive:    'motorbike',
};

export default function RestaurantNavigator() {
  const { user } = useContext(AuthContext);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...buildTabConfig(),
        tabBarIcon: ({ color }) => (
          <Icon name={ICONS[route.name]} size={24} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home"     component={RestaurantHome} />
      <Tab.Screen name="Donate"   component={CreateDonationScreen} />
      <Tab.Screen name="Dispatch" component={DispatchCenterScreen} />
      {user?.role === 'user' && (
        <Tab.Screen name="Drive" component={DriverMarketplaceScreen} />
      )}
    </Tab.Navigator>
  );
}
