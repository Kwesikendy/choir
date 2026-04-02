import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen, PartOverviewScreen, PracticeScreen, ProgressScreen } from './src/screens';
import { VoicePart } from './src/types';

export type RootStackParamList = {
  Home: undefined;
  PartOverview: { part: VoicePart };
  Practice: undefined;
  Progress: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Choir Practice' }}
        />
        <Stack.Screen
          name="PartOverview"
          component={PartOverviewScreen}
          options={{ title: 'Voice Part' }}
        />
        <Stack.Screen
          name="Practice"
          component={PracticeScreen}
          options={{ title: 'Practice' }}
        />
        <Stack.Screen
          name="Progress"
          component={ProgressScreen}
          options={{ title: 'Progress' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}