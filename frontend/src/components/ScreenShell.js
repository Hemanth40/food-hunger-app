// Proper safe-area aware ScreenShell using react-native-safe-area-context
import React from 'react';
import { ScrollView, View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';

export default function ScreenShell({
  children,
  scroll = true,
  contentContainerStyle,
  style,
  refreshControl,
  noPadding = false,
  bgColor = C.bg,
}) {
  const insets = useSafeAreaInsets();

  const baseStyle = {
    backgroundColor: bgColor,
    flex: 1,
  };

  if (!scroll) {
    return (
      <SafeAreaView style={[baseStyle, style]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
        <View style={[styles.fill, contentContainerStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[baseStyle, style]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          noPadding ? null : styles.scrollPad,
          // Extra bottom padding for tab bar
          { paddingBottom: insets.bottom + 80 },
          contentContainerStyle,
        ]}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  scrollPad: { paddingHorizontal: 20, paddingTop: 8 },
});
