import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function buildTabConfig() {
  return {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: '#E23744',
    tabBarInactiveTintColor: '#AEAEB2',
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    tabBarStyle: {
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
      backgroundColor: '#FFFFFF',
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      height: Platform.OS === 'ios' ? 84 : 64,
      paddingBottom: Platform.OS === 'ios' ? 26 : 8,
      paddingTop: 8,
    },
    tabBarIconStyle: {
      marginBottom: 0,
    },
    sceneStyle: {
      backgroundColor: '#FFFFFF',
    },
  };
}

// Keep backward compat
export function buildModernTabs() {
  return buildTabConfig();
}
