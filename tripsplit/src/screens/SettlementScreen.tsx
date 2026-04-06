import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';

type SettlementRouteProp = RouteProp<HomeStackParamList, 'Settlement'>;

type SettlementsSummary = {
  event_participant_id: number;
  total_allocations: number;
  total_paid: number;
  net: number;
  display_name: string;
};

type Settlements = {
  payer_display_name: string;
  payee_display_name: string;
  amount: number;
};

type Participant = {
  event_participant_id: number;
  display_name: string;
};

export default function SettlementScreen() {
  const route = useRoute<SettlementRouteProp>();
  const { event_id } = route.params;
  const [settlementSummary, setSettlementSummary] = useState<SettlementsSummary[]>([]);
  const [settlements, setSettlements] = useState<Settlements[]>([]);
  const [participants, setPartcipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFocused = useIsFocused();

  useEffect(() => {
    let cancelled = false;

    async function loadSettlements() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${BASE_URL}/api/events/${event_id}/settlements`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '精算結果の取得に失敗しました');
        }

        if (!cancelled) {
          setSettlements(data.settlements ?? []);
          setSettlementSummary(data.settlement_summary ?? []);
          setPartcipants(data.participants ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '精算結果の取得に失敗しました');
          setSettlements([]);
          setSettlementSummary([]);
          setPartcipants([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettlements();

    return () => {
      cancelled = true;
    };
  }, [event_id, isFocused]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>精算結果</Text>
      <Text style={styles.caption}>参加者数: {participants.length}人</Text>

      <Text style={styles.sectionTitle}>参加者別サマリ</Text>
      {settlementSummary.length === 0 ? (
        <Text style={styles.emptyText}>まだ精算サマリはありません</Text>
      ) : (
        settlementSummary.map((item) => (
          <View key={item.event_participant_id} style={styles.card}>
            <Text style={styles.name}>{item.display_name}</Text>
            <Text>負担額合計: {item.total_allocations}円</Text>
            <Text>支払額合計: {item.total_paid}円</Text>
            <Text>差額: {item.net}円</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>精算一覧</Text>
      {settlements.length === 0 ? (
        <Text style={styles.emptyText}>精算は不要です</Text>
      ) : (
        settlements.map((item, index) => (
          <View key={`${item.payer_display_name}-${item.payee_display_name}-${index}`} style={styles.card}>
            <Text style={styles.name}>
              {item.payer_display_name} → {item.payee_display_name}
            </Text>
            <Text>{item.amount}円</Text>
          </View>
        ))
      )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  caption: {
    color: '#555',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    color: '#666',
  },
});
