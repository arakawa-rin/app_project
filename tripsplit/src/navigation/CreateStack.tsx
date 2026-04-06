import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateStackParamList } from './types';
import EventCreateScreen from '../screens/EventCreateScreen';
import JoinEventScreen from '../screens/JoinEventScreen';
import JoinConfirmScreen from '../screens/JoinConfirmScreen';

const Stack = createNativeStackNavigator<CreateStackParamList>();

export default function CreateStack() {
  return (
    <Stack.Navigator id="CreateStack" initialRouteName="EventCreate">
      <Stack.Screen name="EventCreate" component={EventCreateScreen} />
      <Stack.Screen name="JoinEvent" component={JoinEventScreen} />
      <Stack.Screen name="JoinConfirm" component={JoinConfirmScreen} />
    </Stack.Navigator>
  );
}
