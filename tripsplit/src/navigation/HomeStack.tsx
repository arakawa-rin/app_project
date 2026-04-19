import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import EventListScreen from '../screens/EventListScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import EventEditScreen from '../screens/EventEditScreen';
import ExpenseAddScreen from '../screens/ExpenseAddScreen';
import ExpenseEditScreen from '../screens/ExpenseEditScreen';
import SettlementScreen from '../screens/SettlementScreen';
import { MaterialIcons } from "@expo/vector-icons";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      id="HomeStack"
      initialRouteName="EventList"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="EventList" component={EventListScreen} /> 
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventEdit" component={EventEditScreen} />
      <Stack.Screen name="ExpenseAdd" component={ExpenseAddScreen} />
      <Stack.Screen name="ExpenseEdit" component={ExpenseEditScreen} />
      <Stack.Screen name="Settlement" component={SettlementScreen} />
    </Stack.Navigator>
  );
}
