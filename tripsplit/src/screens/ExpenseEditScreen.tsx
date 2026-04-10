import React, { useState, useEffect, use,  } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, Pressable, ScrollView,   } from 'react-native';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { BASE_URL } from '../api/config';

type ExpenseEditNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'ExpenseEdit'>;
type ExpenseEditRouteProp = RouteProp<HomeStackParamList, 'ExpenseEdit'>;

type Expense = {
  expense_id: number;
  expense_amount: string;
  expense_at: string;
  category_name: string | null;
  payer_ep_id: number;
  payer_name: string;
};

type Participant = {
  event_participant_id: number;
  display_name: string;
};



export default function ExpenseEditScreen() {

  const route = useRoute<ExpenseEditRouteProp>();
  const { event_id } = route.params;
  const { expense_id } = route.params;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payerEpId, setPayerEpId] = useState<number | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseAt, setExpenseAt] = useState('');
  const [categoryName, setCategoryName] = useState(''); 
  const [splitMethod, setSplitMethod] = useState('EQUAL');
  const [unitPrice, setUnitPrice] = useState('');
  const [participantUnits, setParticipantUnits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFocused = useIsFocused();
  const[submitting, setSubmitting] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  useEffect(() => {
    let cancelled = false;

    async function loadExpenseEdit() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${BASE_URL}/api/events/${event_id}/expenses/${route.params.expense_id}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '費用の詳細の取得に失敗しました');
        }

        if (!cancelled) {
          const allocations: { event_participant_id: number; weight: number; allocation_amount: string }[] = data.allocations ?? [];

          setParticipants(data.participants ?? []);
          setPayerEpId(data.expense.payer_ep_id);
          setExpenseAmount(data.expense.expense_amount);
          setExpenseAt(data.expense.expense_at?.slice(0, 10) ?? '');
          setCategoryName(data.category?.category_name ?? '');
          setSelectedParticipants(allocations.map((a) => a.event_participant_id));

          const isUnits = allocations.some((a) => a.weight !== 1);
          if (isUnits) {
            setSplitMethod('UNITS');
            const first = allocations.find((a) => a.weight > 0);
            if (first) {
              setUnitPrice(String(parseFloat(first.allocation_amount) / first.weight));
            }
            const units: Record<number, string> = {};
            allocations.forEach((a) => { units[a.event_participant_id] = String(a.weight); });
            setParticipantUnits(units);
          } else {
            setSplitMethod('EQUAL');
          }
        }
      }
      catch (err) {
        if (!cancelled) {
          setParticipants([]);
          setPayerEpId(null);
          setSelectedParticipants([]);
          setExpenseAmount('');
          setExpenseAt('');
          setCategoryName('');
          setSplitMethod('EQUAL');
          setUnitPrice('');
          setParticipantUnits({});
          setError(err instanceof Error ? err.message : '通信エラーが発生しました');
        }
      }
      finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExpenseEdit();

    return () => {
      cancelled = true;
    };
  }, [event_id, isFocused]);

  async function handleUpdate() {
    if (!payerEpId || selectedParticipants.length === 0 || !expenseAmount || !expenseAt || !categoryName) {
      Alert.alert('入力エラー', '必須項目をすべて入力してください');
      return;
    }

    setSubmitting(true);

    try {
      const requestBody: Record<string, unknown> = {
        expense_amount: expenseAmount,
        expense_at: expenseAt,
        category_name: categoryName,
        payer_ep_id: payerEpId,
        participants: selectedParticipants,
        split_method: splitMethod,
      };

      if (splitMethod === 'UNITS') {
        requestBody.unit_price = unitPrice;
        selectedParticipants.forEach((id) => {
          requestBody[`units_${id}`] = participantUnits[id] ?? '0';
        });
      }

      const response = await fetch(`${BASE_URL}/api/events/${event_id}/expenses/${expense_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '支出の編集に失敗しました');
      }

      Alert.alert('編集完了', '支出を編集しました');
      navigation.goBack();
    } catch (err) {
      Alert.alert('通信エラー', err instanceof Error ? err.message : '支出の編集に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }
  
    function toggleParticipant(eventParticipantId: number) {
      setSelectedParticipants((current) =>
        current.includes(eventParticipantId)
          ? current.filter((id) => id !== eventParticipantId)
          : [...current, eventParticipantId]
      );
    }
  
    function updateParticipantUnit(eventParticipantId: number, value: string) {
      setParticipantUnits((current) => ({
        ...current,
        [eventParticipantId]: value,
      }));
    }
  
    useEffect(() => {
      setParticipantUnits((current) => {
        const next: Record<number, string> = {};
  
        selectedParticipants.forEach((id) => {
          next[id] = current[id] ?? '1';
        });
  
        return next;
      });
    }, [selectedParticipants]);

    
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>支出の編集画面</Text>
      {loading ? <Text style={styles.infoText}>参加者を読み込み中...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="費目"
        value={categoryName}
        onChangeText={setCategoryName}
      />
      <TextInput
        style={styles.input}
        placeholder="金額"
        value={expenseAmount}
        onChangeText={setExpenseAmount}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="支出日 (例: 2024-01-01)"
        value={expenseAt}
        onChangeText={setExpenseAt}
      /> 
      <Text style={styles.sectionTitle}>割り方</Text>
      <View style={styles.splitMethodRow}>
        <Pressable
          style={[
            styles.splitMethodButton,
            splitMethod === 'EQUAL' && styles.optionButtonSelected,
          ]}
          onPress={() => setSplitMethod('EQUAL')}
        >
          <Text
            style={[
              styles.optionText,
              splitMethod === 'EQUAL' && styles.optionTextSelected,
            ]}
          >
            割り勘
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.splitMethodButton,
            splitMethod === 'UNITS' && styles.optionButtonSelected,
          ]}
          onPress={() => setSplitMethod('UNITS')}
        >
          <Text
            style={[
              styles.optionText,
              splitMethod === 'UNITS' && styles.optionTextSelected,
            ]}
        >
            口数割
          </Text>
        </Pressable>
      </View>
      {splitMethod === 'UNITS' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="1口単価"
            value={unitPrice}
            onChangeText={setUnitPrice}
            keyboardType="numeric"
          />
          <Text style={styles.unitHint}>負担者ごとに口数を入力してください</Text>
        </>
      ) : null}
      <Text style={styles.sectionTitle}>立替人</Text>
      {participants.map((participant) => (
        <Pressable
          key={`payer-${participant.event_participant_id}`}
          style={[
            styles.optionButton,
            payerEpId === participant.event_participant_id && styles.optionButtonSelected,
          ]}
          onPress={() => setPayerEpId(participant.event_participant_id)}
        >
          <Text
            style={[
              styles.optionText,
              payerEpId === participant.event_participant_id && styles.optionTextSelected,
            ]}
          >
            {payerEpId === participant.event_participant_id ? '●' : '○'} {participant.display_name}
          </Text>
        </Pressable>
      ))}
      <Text style={styles.sectionTitle}>負担者</Text>
      {participants.map((participant) => {
        const selected = selectedParticipants.includes(participant.event_participant_id);

        return (
          <React.Fragment key={`participant-${participant.event_participant_id}`}>
            <Pressable
              style={[
                styles.optionButton,
                selected && styles.optionButtonSelected,
              ]}
              onPress={() => toggleParticipant(participant.event_participant_id)}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {selected ? '☑' : '☐'} {participant.display_name}
              </Text>
            </Pressable>
            {splitMethod === 'UNITS' && selected ? (
              <TextInput
                style={styles.unitInput}
                placeholder={`${participant.display_name} の口数`}
                value={participantUnits[participant.event_participant_id] ?? ''}
                onChangeText={(value) =>
                  updateParticipantUnit(participant.event_participant_id, value)
                }
                keyboardType="numeric"
              />
            ) : null}
          </React.Fragment>
        );
      })}
      <Button
        title="支出を更新"
        onPress={handleUpdate}
        disabled={submitting}
      />
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
    marginBottom: 16,
  },
  infoText: {
    marginBottom: 12,
    color: '#555',
  },
  errorText: {
    marginBottom: 12,
    color: '#b00020',
  },
  unitHint: {
    marginBottom: 12,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  splitMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  splitMethodButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  optionButtonSelected: {
    borderColor: '#1f6feb',
    backgroundColor: '#eaf2ff',
  },
  optionText: {
    fontSize: 16,
    color: '#222',
  },
  optionTextSelected: {
    color: '#1f4fbf',
    fontWeight: '600',
  },
  unitInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginTop: -2,
    marginBottom: 12,
    marginLeft: 12,
  },
});

