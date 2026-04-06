import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeStack from './HomeStack';
import CreateStack from './CreateStack';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator id="AppTabs">
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Create" component={CreateStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}
