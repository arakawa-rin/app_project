import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  useIsFocused,
  useRoute,
  RouteProp,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { BASE_URL } from "../api/config";
import ExpenseFormScreen, {
  ExpenseFormParticipant,
} from "../components/ExpenseFormScreen";

type ExpenseAddRouteProp = RouteProp<HomeStackParamList, "ExpenseAdd">;

export default function ExpenseAddScreen() {
  const route = useRoute<ExpenseAddRouteProp>();
  const { event_id } = route.params;
  const [participants, setParticipants] = useState<ExpenseFormParticipant[]>([]);
  const [payerEpId, setPayerEpId] = useState<number | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>(
    [],
  );
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAt, setExpenseAt] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [splitMethod, setSplitMethod] = useState("EQUAL");
  const [unitPrice, setUnitPrice] = useState("");
  const [participantUnits, setParticipantUnits] = useState<
    Record<number, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isFocused = useIsFocused();
  const [submitting, setSubmitting] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  async function handleSubmit() {
    if (
      !expenseAmount ||
      !expenseAt ||
      !categoryName ||
      !payerEpId ||
      selectedParticipants.length === 0
    ) {
      Alert.alert("入力エラー", "すべて入力してください");
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

      if (splitMethod === "UNITS") {
        requestBody.unit_price = unitPrice;

        selectedParticipants.forEach((id) => {
          requestBody[`units_${id}`] = participantUnits[id] ?? "0";
        });
      }

      const respontse = await fetch(
        `${BASE_URL}/api/events/${event_id}/expenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        },
      );

      const data = await respontse.json();

      if (!respontse.ok) {
        throw new Error(data.error || "支出の追加に失敗しました");
      }

      Alert.alert("追加完了", "支出を追加しました");
      setExpenseAmount("");
      setExpenseAt("");
      setCategoryName("");
      setPayerEpId(null);
      setSelectedParticipants([]);
      setUnitPrice("");
      setParticipantUnits({});
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        "通信エラー",
        err instanceof Error ? err.message : "支出の追加に失敗しました",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadParticipants() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${BASE_URL}/api/events/${event_id}`, {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "参加者の取得に失敗しました");
        }

        if (!cancelled) {
          const fetchedParticipants = data.participants ?? [];
          setParticipants(fetchedParticipants);
          setSelectedParticipants(
            fetchedParticipants.map(
              (participant: ExpenseFormParticipant) =>
                participant.event_participant_id,
            ),
          );
          if (fetchedParticipants.length > 0) {
            setPayerEpId(fetchedParticipants[0].event_participant_id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "通信エラーが発生しました",
          );
          setParticipants([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadParticipants();

    return () => {
      cancelled = true;
    };
  }, [event_id, isFocused]);

  function toggleParticipant(eventParticipantId: number) {
    setSelectedParticipants((current) =>
      current.includes(eventParticipantId)
        ? current.filter((id) => id !== eventParticipantId)
        : [...current, eventParticipantId],
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
        next[id] = current[id] ?? "1";
      });

      return next;
    });
  }, [selectedParticipants]);

  return (
    <ExpenseFormScreen
      screenTitle="支出を追加"
      submitLabel="支出を追加"
      loading={loading}
      error={error}
      participants={participants}
      payerEpId={payerEpId}
      selectedParticipants={selectedParticipants}
      expenseAmount={expenseAmount}
      expenseAt={expenseAt}
      categoryName={categoryName}
      splitMethod={splitMethod}
      unitPrice={unitPrice}
      participantUnits={participantUnits}
      submitting={submitting}
      onBack={() => navigation.goBack()}
      onSubmit={handleSubmit}
      setPayerEpId={setPayerEpId}
      setExpenseAmount={setExpenseAmount}
      setExpenseAt={setExpenseAt}
      setCategoryName={setCategoryName}
      setSplitMethod={setSplitMethod}
      toggleParticipant={toggleParticipant}
      updateParticipantUnit={updateParticipantUnit}
      setUnitPrice={setUnitPrice}
    />
  );
}
