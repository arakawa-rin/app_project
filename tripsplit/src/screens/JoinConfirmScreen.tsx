import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CreateStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';


type JoinConfirmNavigationProp = NativeStackNavigationProp<CreateStackParamList, 'JoinConfirm'>;
type JoinConfirmRouteProp = RouteProp<CreateStackParamList, 'JoinConfirm'>;

type Event = {
  event_id: number;
  invite_code: string;
  event_name: string;
  start_date: string;
  end_date: string;
};

type Unlinked = {
  event_participant_id: number;
  display_name: string;
  status: string;
  user_id: number | null;
};


export default function JoinConfirmScreen() {

  const navigation = useNavigation<JoinConfirmNavigationProp>();
  const route = useRoute<JoinConfirmRouteProp>();
  const { event, unlinked } = route.params;
  const [eventName, setEventName] = useState(event.event_name);
  const [startDate, setStartDate] = useState(event.start_date);
  const [endDate, setEndDate] = useState(event.end_date);
  const [selectedEpId, setSelectedEpId] = useState(unlinked.length > 0 ? unlinked[0].event_participant_id : null);
  const [myDisplayName, setMyDisplayName] = useState('');
  const [selectedDisplayName, setSelectedDisplayName] = useState(unlinked.length > 0 ? unlinked[0].display_name : '');
  const [submitting, setSubmitting] = useState(false);
  const isFocused = useIsFocused();

    async function handlejoin(){
      if (selectedEpId===null && !myDisplayName) {
        Alert.alert('入力エラー', '表示名を入力してください');
        return;
      }

        setSubmitting(true);

      try {
        const response = await fetch(`${BASE_URL}/api/join/confirm/${event.event_id}`, {
          credentials: 'include',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            display_name: myDisplayName,
            selected_ep_id: selectedEpId === null ? 'new' : selectedEpId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to join the event');
        }
        Alert.alert('成功', 'イベントに参加しました');
        navigation.getParent()?.navigate('Home', { screen: 'EventDetail', params: { event_id: event.event_id } });
      } 
      
      catch (error) {
        Alert.alert('エラー', 'イベントへの参加に失敗しました');
      } 
      
      finally {
        setSubmitting(false);
      }
    }



  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.event_name}</Text>
      <Text>{event.start_date} 〜 {event.end_date}</Text>

      <Text style={styles.section}>あなたは誰ですか？</Text>

      {unlinked.map((p) => (
        <Pressable
          key={p.event_participant_id}
          style={[styles.option, selectedEpId === p.event_participant_id && styles.optionSelected]}
          onPress={() => setSelectedEpId(p.event_participant_id)}
        >
          <Text style={selectedEpId === p.event_participant_id ? styles.optionTextSelected : styles.optionText}>
            {selectedEpId === p.event_participant_id ? '●' : '○'} {p.display_name}
          </Text>
        </Pressable>
      ))}

      <Pressable
        style={[styles.option, selectedEpId === null && styles.optionSelected]}
        onPress={() => setSelectedEpId(null)}
      >
        <Text style={selectedEpId === null ? styles.optionTextSelected : styles.optionText}>
          {selectedEpId === null ? '●' : '○'} 新しい参加者として追加
        </Text>
      </Pressable>

      {selectedEpId === null && (
        <TextInput
          style={styles.input}
          placeholder="表示名"
          value={myDisplayName}
          onChangeText={setMyDisplayName}
        />
      )}

      <Button
        title={submitting ? '送信中...' : '参加する'}
        onPress={handlejoin}
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
  section: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionSelected: {
    borderColor: '#1f6feb',
    backgroundColor: '#eaf2ff',
  },
  optionText: {
    fontSize: 16,
    color: '#222',
  },
  optionTextSelected: {
    fontSize: 16,
    color: '#1f4fbf',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
