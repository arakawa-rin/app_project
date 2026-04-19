import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CreateStackParamList } from "../navigation/types";
import { BASE_URL } from "../api/config";

const HERO_TOP_EXTENSION = 40;
const HERO_MIN_HEIGHT = 180;


type JoinConfirmNavigationProp = NativeStackNavigationProp<
  CreateStackParamList,
  "JoinConfirm"
>;
type JoinConfirmRouteProp = RouteProp<CreateStackParamList, "JoinConfirm">;

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
  const [selectedEpId, setSelectedEpId] = useState(
    unlinked.length > 0 ? unlinked[0].event_participant_id : null,
  );
  const [myDisplayName, setMyDisplayName] = useState("");
  const [selectedDisplayName, setSelectedDisplayName] = useState(
    unlinked.length > 0 ? unlinked[0].display_name : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  async function handlejoin() {
    if (selectedEpId === null && !myDisplayName) {
      Alert.alert("入力エラー", "表示名を入力してください");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${BASE_URL}/api/join/confirm/${event.event_id}`,
        {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            display_name: myDisplayName,
            selected_ep_id: selectedEpId === null ? "new" : selectedEpId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to join the event");
      }
      Alert.alert("成功", "イベントに参加しました");
      navigation.getParent()?.navigate("Home", {
        screen: "EventDetail",
        params: { event_id: event.event_id },
      });
    } catch (error) {
      Alert.alert("エラー", "イベントへの参加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#ea580c", "#f97316", "#afedf3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1.3 }}
        style={[
          styles.hero,
          {
            marginTop: -HERO_TOP_EXTENSION,
            minHeight: HERO_MIN_HEIGHT + HERO_TOP_EXTENSION,
            paddingTop: insets.top + 8 + HERO_TOP_EXTENSION,
          },
        ]}
      >
        <MaterialIcons
          name="flight"
          size={120}
          color="#fff"
          style={styles.heroPlane}
        />
        <View style={styles.heroNav}>
          <Text style={[styles.heroNavText, { fontStyle: "italic" }]}>
            TripSplit
          </Text>
        </View>
        <View style={styles.heroTitle}>
          <Text style={styles.heroTitleText}>あなたはどの参加者ですか？</Text>
          <Text style={styles.eventName}>~{event.event_name}~</Text>
          <View style={styles.eventDateRow}>
            <MaterialIcons name="date-range" size={20} color="#29c280" />
            <Text style={styles.eventDate}>
              {new Date(event.start_date).toLocaleDateString()} 〜{" "}
              {new Date(event.end_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </LinearGradient>
      {unlinked.map((p) => (
        <Pressable
          key={p.event_participant_id}
          style={[
            styles.option,
            selectedEpId === p.event_participant_id && styles.optionSelected,
          ]}
          onPress={() => setSelectedEpId(p.event_participant_id)}
        >
          <View style={styles.optionContent}>
            <View
              style={[
                styles.optionIcon,
                selectedEpId === p.event_participant_id &&
                  styles.optionIconSelected,
              ]}
            >
              <MaterialIcons
                name="person"
                size={20}
                color={
                  selectedEpId === p.event_participant_id ? "#1f6feb" : "#7b8794"
                }
              />
            </View>
            <Text
              style={
                selectedEpId === p.event_participant_id
                  ? styles.optionTextSelected
                  : styles.optionText
              }
            >
              {p.display_name}
            </Text>
            <MaterialIcons
              name={
                selectedEpId === p.event_participant_id
                  ? "radio-button-checked"
                  : "radio-button-unchecked"
              }
              size={24}
              color={
                selectedEpId === p.event_participant_id ? "#1f6feb" : "#b0b7c3"
              }
            />
          </View>
        </Pressable>
      ))}

      <Pressable
        style={[styles.option, selectedEpId === null && styles.optionSelected]}
        onPress={() => setSelectedEpId(null)}
      >
        <View style={styles.optionContent}>
          <View
            style={[
              styles.optionIcon,
              selectedEpId === null && styles.optionIconSelected,
            ]}
          >
            <MaterialIcons
              name="person-add"
              size={20}
              color={selectedEpId === null ? "#1f6feb" : "#7b8794"}
            />
          </View>
          <Text
            style={
              selectedEpId === null
                ? styles.optionTextSelected
                : styles.optionText
            }
          >
            新しい参加者
          </Text>
          <MaterialIcons
            name={
              selectedEpId === null
                ? "radio-button-checked"
                : "radio-button-unchecked"
            }
            size={24}
            color={selectedEpId === null ? "#1f6feb" : "#b0b7c3"}
          />
        </View>
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
        title={submitting ? "送信中..." : "参加する"}
        onPress={handlejoin}
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  hero: {
    width: "100%",
    paddingHorizontal: 40,
    paddingBottom: 36,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    overflow: "hidden",
    minHeight: HERO_MIN_HEIGHT,
  },
  heroTitle: {
    fontWeight: "700",
    width: "100%",
    alignItems: "center",
    paddingTop: 20,
    marginBottom: 0,
  },
  heroTitleText:{
    color:"#ffffff",
    fontWeight:700,
    fontSize:35,
  },
  eventName: {
    color: "#fffaf7e5",
    fontSize: 30,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 35,
    paddingHorizontal: 16,
  },
  eventDate:{
    fontSize:20,
    color: "#fffaf7e5",
    marginLeft: 6,
  },
  eventDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  heroPlane: {
    position: "absolute",
    top: 65,
    right: 16,
    opacity: 0.1,
    transform: [{ rotate: "35deg" }],
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    marginTop:10,
  },
  heroNavText: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600",
  },
  section: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    marginLeft:16,
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginTop: 15,
    marginLeft: 16,
    marginRight: 16,
  },
  optionSelected: {
    borderColor: "#1f6feb",
    backgroundColor: "#eaf2ff",
    marginLeft: 16,
    marginRight: 16,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f2f4f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionIconSelected: {
    backgroundColor: "#dbeafe",
  },
  optionText: {
    fontSize: 16,
    color: "#222",
    flex: 1,
  },
  optionTextSelected: {
    fontSize: 16,
    color: "#1f4fbf",
    fontWeight: "600",
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop:15,
    marginLeft:16,
    marginRight:16
  },
});
