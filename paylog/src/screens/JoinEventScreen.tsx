import React, { useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CreateStackParamList } from "../navigation/types";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { BASE_URL } from "../api/config";

const HERO_TOP_EXTENSION = 40;
const HERO_MIN_HEIGHT = 180;

type JoinEventNavigationProp = NativeStackNavigationProp<
  CreateStackParamList,
  "JoinEvent"
>;

export default function JoinEventScreen() {
  const navigation = useNavigation<JoinEventNavigationProp>();
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  async function handleInviteCodeSubmit() {
    if (!inviteCode) {
      Alert.alert("入力エラー", "招待コードを入力してください");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "イベントへの参加に失敗しました");
      }

      setInviteCode("");
      navigation.navigate("JoinConfirm", {
        event: data.event,
        unlinked: data.unlinked,
      });
    } catch (err) {
      Alert.alert(
        "通信エラー",
        err instanceof Error ? err.message : "通信エラーが発生しました",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChange(text: string) {
    const normalized = text
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    setInviteCode(normalized);
  }

  async function handlePaste() {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) return;

      handleChange(text);
      inputRef.current?.focus();
    } catch {
      Alert.alert("エラー", "クリップボードの読み取りに失敗しました");
    }
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container}>
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
          <View style={styles.heroicon}>
            <MaterialIcons name="group-add" size={80} color="#fde5e5" />
          </View>
          <View style={styles.herotitle}>
            <Text style={styles.heroNavText}>招待コードで参加</Text>
          </View>
        </LinearGradient>
        <View style={styles.joinCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>6桁の招待コードを入力</Text>
            <Pressable
              style={styles.pasteButton}
              onPress={handlePaste}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="招待コードを貼り付け"
            >
              <MaterialIcons name="content-paste" size={20} color="#38ba79" />
            </Pressable>
          </View>
          <Pressable onPress={() => inputRef.current?.focus()}>
            <View style={styles.codeRow}>
              {Array.from({ length: 6 }).map((_, index) => (
                <View key={index} style={styles.codeBox}>
                  <Text style={styles.codeChar}>{inviteCode[index] ?? ""}</Text>
                </View>
              ))}
            </View>
          </Pressable>
          <TextInput
            ref={inputRef}
            value={inviteCode}
            onChangeText={handleChange}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
            style={styles.hiddenInput}
          />
          <Pressable
            style={[styles.joinButton, submitting && styles.buttonDisabled]}
            onPress={handleInviteCodeSubmit}
            disabled={submitting}
          >
            <Text style={styles.joinButtonText}>
              {submitting ? "送信中..." : "参加する"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "relative",
    flex: 1,
    backgroundColor: "#f7f6f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f7f6f5",
  },
  content: {},
  hero: {
    width: "100%",
    minHeight: HERO_MIN_HEIGHT,
    paddingHorizontal: 40,
    paddingBottom: 36,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  heroPlane: {
    position: "absolute",
    top: 16,
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
  },
  heroicon: {
    width: 120,
    height: 120,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  herotitle: {
    width: "100%",
    alignItems: "center",
    paddingTop: 3,
    marginBottom: 0,
    color:"#fff",
  },
  heroNavText: {
    color: "#fffafac0",
    fontSize: 25,
    fontWeight: "600",
    marginTop: 20,
  },
  heroNavButton: {
    padding: 8,
    marginLeft: -15,
    marginRight: -15,
  },
  title: {
    marginTop: 30,
    fontSize: 20,
    textAlign: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    gap: 8,
  },
  joinCard: {
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginTop: -18,
    paddingBottom: 20,
    marginLeft: 14,
    marginRight: 14,
    height: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  codeBox: {
    width: 44,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6dbe4",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  codeChar: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2e2f2f",
  },
  pasteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6f9fc",
    marginBottom:-30
  },
  joinButton: {
    backgroundColor: "#00bcd4",
    alignSelf: "stretch",
    marginHorizontal: 50,
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 15,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: 500,
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
});
