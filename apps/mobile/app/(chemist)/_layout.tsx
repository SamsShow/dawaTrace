import { Tabs } from 'expo-router';

export default function ChemistLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f3f4f6' },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#15803d',
      }}
    >
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: () => null }} />
      <Tabs.Screen name="dispense" options={{ title: 'Dispense', tabBarIcon: () => null }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: () => null }} />
    </Tabs>
  );
}
