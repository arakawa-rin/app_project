import React, { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CreateStackParamList } from "../navigation/types";
import EventFormScreen from "../components/EventFormScreen";
import { BASE_URL } from "../api/config";

export default function EventCreateScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CreateStackParamList>>();
  const [eventName, setEventName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleAddMember() {
    const nextMemberName = memberNameInput.trim();

    if (!nextMemberName) {
      return;
    }

    setMemberNames((current) => [...current, nextMemberName]);
    setMemberNameInput("");
  }

  function handleRemoveMember(targetIndex: number) {
    setMemberNames((current) =>
      current.filter((_, index) => index !== targetIndex),
    );
  }

  async function handleSubmit() {
    if (!eventName || !displayName || !startDate || !endDate) {
      Alert.alert("入力エラー", "すべて入力してください");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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
        throw new Error(data.error || "イベント作成に失敗しました");
      }

      Alert.alert("作成完了", "イベントを作成しました");
      setEventName("");
      setDisplayName("");
      setMemberNameInput("");
      setMemberNames([]);
      setStartDate("");
      setEndDate("");
      navigation.getParent()?.navigate("Home");
    } catch (err) {
      Alert.alert(
        "通信エラー",
        err instanceof Error ? err.message : "イベント作成に失敗しました",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EventFormScreen
      heroTitle="新しい思い出を作ろう"
      eventName={eventName}
      onEventNameChange={setEventName}
      displayName={displayName}
      onDisplayNameChange={setDisplayName}
      startDate={startDate}
      onStartDateChange={setStartDate}
      endDate={endDate}
      onEndDateChange={setEndDate}
      memberNameInput={memberNameInput}
      onMemberNameInputChange={setMemberNameInput}
      onAddMember={handleAddMember}
      memberNames={memberNames}
      onRemoveMember={handleRemoveMember}
      primaryAction={{
        label: submitting ? "送信中..." : "イベントを作成",
        onPress: handleSubmit,
        disabled: submitting,
      }}
      secondaryAction={{
        label: "招待コードで参加",
        onPress: () => navigation.navigate("JoinEvent"),
      }}
    />
  );
}
