import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';

type EventEditNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'EventEdit'>;



export default function EventEditScreen() {
  return (
    <View>
      <Text>EventEditScreen</Text>
    </View>
  );
}
