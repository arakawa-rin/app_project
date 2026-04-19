import React, { useState, useEffect } from "react";
import { Alert } from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { BASE_URL } from "../api/config";
import ExpenseFormScreen, {
  ExpenseFormParticipant,
} from "../components/ExpenseFormScreen";

type ExpenseEditRouteProp = RouteProp<HomeStackParamList, "ExpenseEdit">;

function formatInitialDecimalString(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return Number.isInteger(parsed) ? parsed.toFixed(0) : value;
}

function formatInitialNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : String(value);
}

export default function ExpenseEditScreen() {
  const route = useRoute<ExpenseEditRouteProp>();
  const { event_id } = route.params;
  const { expense_id } = route.params;
  const [participants, setParticipants] = useState<ExpenseFormParticipant[]>([]);
  const [payerEpId, setPayerEpId] = useState<number | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAt, setExpenseAt] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [splitMethod, setSplitMethod] = useState("EQUAL");
  const [unitPrice, setUnitPrice] = useState("");
  const [participantUnits, setParticipantUnits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isFocused = useIsFocused();
  const [submitting, setSubmitting] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  useEffect(() => {
    let cancelled = false;

    async function loadExpenseEdit() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${BASE_URL}/api/events/${event_id}/expenses/${route.params.expense_id}`,
          {
            credentials: "include",
          },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "費用の詳細の取得に失敗しました");
        }

        if (!cancelled) {
          const allocations: {
            event_participant_id: number;
            weight: number;
            allocation_amount: string;
          }[] = data.allocations ?? [];

          setParticipants(data.participants ?? []);
          setPayerEpId(data.expense.payer_ep_id);
          setExpenseAmount(
            formatInitialDecimalString(data.expense.expense_amount),
          );
          setExpenseAt(data.expense.expense_at?.slice(0, 10) ?? "");
          setCategoryName(data.category?.category_name ?? "");
          setSelectedParticipants(allocations.map((a) => a.event_participant_id));

          const isUnits = allocations.some((a) => a.weight !== 1);
          if (isUnits) {
            setSplitMethod("UNITS");
            const first = allocations.find((a) => a.weight > 0);
            if (first) {
              const initialUnitPrice =
                parseFloat(first.allocation_amount) / first.weight;
              setUnitPrice(
                formatInitialNumber(initialUnitPrice),
              );
            }
            const units: Record<number, string> = {};
            allocations.forEach((a) => {
              units[a.event_participant_id] = String(a.weight);
            });
            setParticipantUnits(units);
          } else {
            setSplitMethod("EQUAL");
            setUnitPrice("");
            setParticipantUnits({});
          }
        }
      } catch (err) {
        if (!cancelled) {
          setParticipants([]);
          setPayerEpId(null);
          setSelectedParticipants([]);
          setExpenseAmount("");
          setExpenseAt("");
          setCategoryName("");
          setSplitMethod("EQUAL");
          setUnitPrice("");
          setParticipantUnits({});
          setError(
            err instanceof Error ? err.message : "通信エラーが発生しました",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExpenseEdit();

    return () => {
      cancelled = true;
    };
  }, [event_id, isFocused, route.params.expense_id]);

  async function handleUpdate() {
    if (
      !payerEpId ||
      selectedParticipants.length === 0 ||
      !expenseAmount ||
      !expenseAt ||
      !categoryName
    ) {
      Alert.alert("入力エラー", "必須項目をすべて入力してください");
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

      const response = await fetch(
        `${BASE_URL}/api/events/${event_id}/expenses/${expense_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(requestBody),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "支出の編集に失敗しました");
      }

      Alert.alert("編集完了", "支出を編集しました");
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        "通信エラー",
        err instanceof Error ? err.message : "支出の編集に失敗しました",
      );
    } finally {
      setSubmitting(false);
    }
  }

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
      screenTitle="支出を編集"
      submitLabel="支出を更新"
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
      onSubmit={handleUpdate}
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
