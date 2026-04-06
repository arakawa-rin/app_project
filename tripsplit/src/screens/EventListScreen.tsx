import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../api/config';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';


type Event = {
  event_id: number;
  event_name: string;
  start_date: string;
  end_date: string;
};

export default function EventListScreen() {
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${BASE_URL}/api/events`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'イベント一覧の取得に失敗しました');
        }

        if (!cancelled) {
          setCreatedEvents(data.created_events ?? []);
          setJoinedEvents(data.joined_events ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setCreatedEvents([]);
          setJoinedEvents([]);
          setError(err instanceof Error ? err.message : '通信エラーが発生しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  const events = [...createdEvents, ...joinedEvents];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>イベント一覧</Text>
      {loading ? <Text>読み込み中...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && events.length === 0 ? (
        <Text>イベントはまだありません</Text>
      ) : null}
      <FlatList
        data={events}
        keyExtractor={item => String(item.event_id)}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('EventDetail', { event_id: item.event_id })}>
            <View style={styles.card}>
              <Text style={styles.name}>{item.event_name}</Text>
              <Text>{item.start_date} - {item.end_date}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  card: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
});
