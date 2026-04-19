import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from './types';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator id="SettingsStack" initialRouteName="Settings">
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}


