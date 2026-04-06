import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useIsFocused, useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';

type EventDetailRouteProp = RouteProp<HomeStackParamList, 'EventDetail'>;

type EventDetail = {
  event: {
    event_id: number;
    event_name: string;
    start_date: string;
    end_date: string;
    invite_code: string;
  };

  participants: {
    event_participant_id: number;
    display_name: string;
  }[];

  expenses: {
    expense_id: number;
    expense_amount: string;
    expense_at: string;
    category_name: string | null;
    payer_ep_id: number;
    payer_name: string;
  }[];
};

export default function EventDetailScreen() {
  const route = useRoute<EventDetailRouteProp>();
  const { event_id } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [details, setDetails] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFocused = useIsFocused();

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
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
          setDetails(data);
        }
      }
      catch (err) {
        if (!cancelled) {
          setDetails(null);
          setError(err instanceof Error ? err.message : '通信エラーが発生しました');
        }
      }
      finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [event_id, isFocused]);

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View>
        <Text>イベント情報がありません</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{details.event.event_name}</Text>
      <Text>{details.event.start_date} 〜 {details.event.end_date}</Text>
      <Text>招待コード: {details.event.invite_code}</Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ExpenseAdd', { event_id })}
        >
          <Text style={styles.primaryButtonText}>支出を追加</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Settlement', { event_id })}
        >
          <Text style={styles.secondaryButtonText}>精算画面へ</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('EventEdit', { event_id })}
        >
          <Text style={styles.secondaryButtonText}>イベントを編集</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>参加者</Text>
      {details.participants.map((participant) => (
        <Text key={participant.event_participant_id} style={styles.participantName}>
          {participant.display_name}
        </Text>
      ))}

      <Text style={styles.section}>支出</Text>
      {details.expenses.map((expense) => (
        <Pressable
          key={expense.expense_id}
          style={styles.expenseCard}
          onPress={() =>
            navigation.navigate('ExpenseEdit', {
              event_id,
              expense_id: expense.expense_id,
            })
          }
        >
          <Text style={styles.expenseCategory}>{expense.category_name || 'カテゴリなし'}</Text>
          <Text>{expense.expense_amount}円</Text>
          <Text>{expense.payer_name}</Text>
          <Text>{expense.expense_at}</Text>
          <Text style={styles.expenseHint}>タップで支出を編集</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actions: {
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#1f6feb',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 16,
    marginBottom: 4,
  },
  expenseCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fb',
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  expenseHint: {
    marginTop: 6,
    color: '#666',
    fontSize: 12,
  },
});
