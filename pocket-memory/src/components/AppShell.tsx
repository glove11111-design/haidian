import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export function AppShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') {
    return (
      <View style={web.page}>
        <View style={web.phone}>
          <View style={web.status} />
          <View style={web.body}>{children}</View>
        </View>
      </View>
    );
  }
  return (
    <SafeAreaView style={[native.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {children}
    </SafeAreaView>
  );
}

const web = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: '100%' as unknown as number,
    backgroundColor: colors.page,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  phone: {
    width: 390,
    height: 844,
    maxHeight: '96%' as unknown as number,
    backgroundColor: colors.bg,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  status: { height: 12 },
  body: { flex: 1 },
});

const native = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
});
