import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View,Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CreateStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';

type JoinEventNavigationProp = NativeStackNavigationProp<CreateStackParamList, 'JoinEvent'>;


export default function JoinEventScreen() {

  const navigation = useNavigation<JoinEventNavigationProp>();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleInviteCodeSubmit(){
    if (!inviteCode) {
      Alert.alert('入力エラー', '招待コードを入力してください');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'イベントへの参加に失敗しました');
      }

      setInviteCode('');
      navigation.navigate('JoinConfirm', {
        event: data.event,
        unlinked: data.unlinked,
      });
    } catch (err) {
      Alert.alert('通信エラー', err instanceof Error ? err.message : '通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <View>
      <Text>招待コードを入力してください</Text>
      <TextInput
        placeholder="招待コード"
        value={inviteCode}
        onChangeText={setInviteCode}
      />
      <Button
        title="参加する"
        onPress={handleInviteCodeSubmit}
        disabled={submitting}
      />
    </View>
  );
}
