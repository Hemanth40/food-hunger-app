import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';

// Matches the new design system in src/theme.js
const appTheme = {
  ...MD3LightTheme,
  roundness: 2, // 2 × 4px = 8px base radius
  colors: {
    ...MD3LightTheme.colors,
    primary:         '#E23744',
    secondary:       '#29A764',
    tertiary:        '#2563EB',
    background:      '#FFFFFF',
    surface:         '#FFFFFF',
    surfaceVariant:  '#F6F6F6',
    outline:         '#E8E8E8',
    onSurface:       '#1C1C1E',
    onSurfaceVariant:'#636366',
    error:           '#E23744',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
