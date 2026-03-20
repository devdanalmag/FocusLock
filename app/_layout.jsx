import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0a0a1a" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a1a' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen 
          name="add-app" 
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen 
          name="set-duration" 
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="settings" />
        <Stack.Screen
          name="stats"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="schedules"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="add-schedule"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="achievements"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="app-limits"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="add-limit"
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});
