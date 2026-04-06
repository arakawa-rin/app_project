import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CreateStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';

export default function EventCreateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CreateStackParamList>>();
  const [eventName, setEventName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [memberNameInput, setMemberNameInput] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!eventName || !displayName || !startDate || !endDate) {
      Alert.alert('入力エラー', 'すべて入力してください');
      return;
    }

    setSubmitting(true);

    try {
        const response = await fetch(`${BASE_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          event_name: eventName,
          display_name: displayName,
          start_date: startDate,
          end_date: endDate,
          member_names: memberNames,
        }),
        });

        const data = await response.json();
 
        if (!response.ok) {
        throw new Error(data.error || 'イベント作成に失敗しました');
        }

      Alert.alert('作成完了', 'イベントを作成しました');
      setEventName('');
      setDisplayName('');
      setMemberNameInput('');
      setMemberNames([]);
      setStartDate('');
      setEndDate('');
      navigation.getParent()?.navigate('Home');
      } 
      
      catch (err) {
      Alert.alert(
        '通信エラー',
        err instanceof Error ? err.message : 'イベント作成に失敗しました'
      );
    } 
    
    finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>イベント作成</Text>
      <TextInput
        style={styles.input}
        placeholder="イベント名"
        value={eventName}
        onChangeText={setEventName}
      />
      <TextInput
        style={styles.input}
        placeholder="あなたの名前"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="参加者の名前"
        value={memberNameInput}
        onChangeText={setMemberNameInput}
      />
      <Button
        title="参加者を追加"
        onPress={() => {
          if (memberNameInput.trim()) {
            setMemberNames([...memberNames, memberNameInput.trim()]);
            setMemberNameInput('');
          }
        }}
      />
      {memberNames.map((name, index) => (
        <Text key={`${name}-${index}`} style={styles.memberName}>
          {name}
        </Text>
      ))}
      <TextInput
        style={styles.input}
        placeholder="開始日 (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="終了日 (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        autoCapitalize="none"
      />
      <Button
        title={submitting ? '送信中...' : '作成する'}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberName: {
    fontSize: 16,
  },
});
