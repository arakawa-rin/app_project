import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { BASE_URL } from "../api/config";
import EventFormScreen from "../components/EventFormScreen";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type EventEditNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "EventEdit"
>;
type EventEditRouteProp = RouteProp<HomeStackParamList, "EventEdit">;

export default function EventEditScreen() {
  const navigation = useNavigation<EventEditNavigationProp>();
  const route = useRoute<EventEditRouteProp>();
  const { event_id, event_participant_id } = route.params;
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEventEdit() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${BASE_URL}/api/events/${event_id}`, {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "イベントの詳細の取得に失敗しました");
        }

        if (!cancelled) {
          setEventName(data.event.event_name ?? "");
          setStartDate(data.event.start_date ?? "");
          setEndDate(data.event.end_date ?? "");
          setDisplayName(
            data.my_ep_id
              ? data.participants.find(
                  (participant: {
                    event_participant_id: number;
                    display_name: string;
                  }) => participant.event_participant_id === data.my_ep_id,
                )?.display_name ?? ""
              : "",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "イベントの詳細の取得に失敗しました",
          );
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
    if (!eventName || !startDate || !endDate || !displayName) {
      Alert.alert("入力エラー", "すべて入力してください");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/events/${event_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          event_name: eventName,
          start_date: startDate,
          end_date: endDate,
          display_name:displayName
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "イベントの更新に失敗しました");
      }

      Alert.alert("更新完了", "イベントを更新しました");
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        "通信エラー",
        err instanceof Error ? err.message : "イベントの更新に失敗しました",
      );
    } finally {
      setSubmitting(false);
    }
  }


  async function handleDelete() {
    Alert.alert("イベント削除", "本当にこのイベントを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`${BASE_URL}/api/events/${event_id}`, {
              method: "DELETE",
              credentials: "include",
            });
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "イベントの削除に失敗しました");
            }

            Alert.alert("削除完了", "イベントを削除しました");
            navigation.popToTop();
          } catch (err) {
            Alert.alert(
              "通信エラー",
              err instanceof Error
                ? err.message
                : "イベントの削除に失敗しました",
            );
          }
        },
      },
    ]);
  }

  async function handleLeave() {
    Alert.alert("イベント退出", "本当にこのイベントを退出しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(
              `${BASE_URL}/api/events/${event_id}/leave`,
              {
                method: "POST",
                credentials: "include",
              },
            );
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "イベントの退出に失敗しました");
            }

            Alert.alert("退出完了", "イベントを退出しました");
            navigation.popToTop();
          } catch (err) {
            Alert.alert(
              "通信エラー",
              err instanceof Error
                ? err.message
                : "イベントの退出に失敗しました",
            );
          }
        },
      },
    ]);
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
    <EventFormScreen
      heroTitle="イベントを編集する"
      eventName={eventName}
      onEventNameChange={setEventName}
      displayName={displayName}
      onDisplayNameChange={setDisplayName}
      displayNamePlaceholder="表示名"
      startDate={startDate}
      onStartDateChange={setStartDate}
      endDate={endDate}
      onEndDateChange={setEndDate}
      primaryAction={{
        label: submitting ? "送信中..." : "イベント情報を更新する",
        onPress: handleUpdate,
        disabled: submitting,
      }}
    >

      <View style={styles.dangerZone}>
        <Pressable
          style={[styles.leaveButton, submitting && styles.buttonDisabled]}
          onPress={handleLeave}
          disabled={submitting}
        >
          <Text style={styles.leaveButtonText}>退出する</Text>
        </Pressable>
        <Pressable
          style={[styles.deleteButton, submitting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={submitting}
        >
          <View style={styles.deleteButtonContent}>
            <Text style={styles.deleteButtonText}>イベントを削除</Text>
            <MaterialCommunityIcons name="trash-can" size={20} color="#b91c1c" style={{ marginLeft: -5 }} />
          </View>
        </Pressable>
      </View>
    </EventFormScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#b02500",
  },
  subActionButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#1f6feb",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  subActionText: {
    color: "#1f6feb",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  dangerZone: {
    marginTop: 12,
    gap: 12,
    flexDirection:"row"
  },
  leaveButton: {
    flex:1,
    backgroundColor: "#fff3e8",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leaveButtonText: {
    color: "#b45309",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  deleteButton: {
    flex:1,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  deleteButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
