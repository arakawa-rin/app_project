import React, { useState, useEffect } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';

type EventEditNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'EventEdit'>;
type EventEditRouteProp = RouteProp<HomeStackParamList, 'EventEdit'>;

type Event = {
  event_id: number;
  event_name: string;
  start_date: string;
  end_date: string;
};

type Participant = {
  event_participant_id: number;
  display_name: string;
};

export default function EventEditScreen() {
  const navigation = useNavigation<EventEditNavigationProp>();
  const route = useRoute<EventEditRouteProp>();
  const { event_id } = route.params;
  const { event_participant_id } = route.params;
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEventEdit() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${BASE_URL}/api/events/${event_id}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'イベントの詳細の取得に失敗しました');
        }

        if (!cancelled) {
          setEventName(data.event.event_name);
          setStartDate(data.event.start_date);
          setEndDate(data.event.end_date);
          setDisplayName(data.my_ep_id ? data.participants.find((p: { event_participant_id: number; display_name: string }) => p.event_participant_id === data.my_ep_id)?.display_name ?? '' : '');        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'イベントの詳細の取得に失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEventEdit();

    return () => {
      cancelled = true;
    };
  }, [event_id]);

  async function handleUpdate() {
    if (!eventName || !startDate || !endDate) {
      Alert.alert('入力エラー', 'すべて入力してください');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/events/${event_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_name: eventName,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'イベントの更新に失敗しました');
      }

      Alert.alert('更新完了', 'イベントを更新しました');
      navigation.goBack();
    } catch (err) {
      Alert.alert('通信エラー', err instanceof Error ? err.message : 'イベントの更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisplay_nameEdit() {
    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/events/${event_id}/participants/${event_participant_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          new_display_name: displayName,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '表示名の更新に失敗しました');
      }

      Alert.alert('更新完了', '表示名を更新しました');
      navigation.goBack();  
    }
     catch (err) {
      Alert.alert('通信エラー', err instanceof Error ? err.message : '表示名の更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'イベント削除',
      '本当にこのイベントを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/api/events/${event_id}`, {
                method: 'DELETE',
                credentials: 'include',
              });
              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'イベントの削除に失敗しました');
              }

              Alert.alert('削除完了', 'イベントを削除しました');
              navigation.popToTop();
            } catch (err) {
              Alert.alert('通信エラー', err instanceof Error ? err.message : 'イベントの削除に失敗しました');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  async function handleLeave() {
    Alert.alert(
      'イベント退出',
      '本当にこのイベントを退出しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/api/events/${event_id}/leave`, {
                method: 'POST',
                credentials: 'include',
              });
              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'イベントの退出に失敗しました');
              }

              Alert.alert('退出完了', 'イベントを退出しました');
              navigation.popToTop();
            } catch (err) {
              Alert.alert('通信エラー', err instanceof Error ? err.message : 'イベントの退出に失敗しました');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>イベント編集</Text>
      <TextInput
        style={styles.input}
        placeholder="イベント名"
        value={eventName}
        onChangeText={setEventName}
      />
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
      <Text style={[styles.section, { marginTop: 24 }]}>表示名編集</Text>
      <TextInput
        style={styles.input}
        placeholder="表示名"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <Button
        title={submitting ? '送信中...' : 'イベント情報を更新する'}
        onPress={handleUpdate}
        disabled={submitting}
      />
      <Button
        title={submitting ? '送信中...' : '表示名を更新する'}
        onPress={handleDisplay_nameEdit}
        disabled={submitting}
      />

      <View style={styles.dangerZone}>
        <Button title="退出する" onPress={handleLeave} color="#e67e22" />
        <Button title="イベントを削除" onPress={handleDelete} color="#b02500" />
      </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorText: {
    color: '#b02500',
  },
  dangerZone: {
    marginTop: 24,
    gap: 12,
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
  },
});
