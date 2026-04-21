import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateRangeCalendar from "./DateRangeCalendar";

const HERO_TOP_EXTENSION = 40;
const HERO_HEIGHT = 170;

type ActionButton = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

type EventFormScreenProps = {
  heroTitle: string;
  eventName: string;
  onEventNameChange: (value: string) => void;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  displayNamePlaceholder?: string;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  primaryAction: ActionButton;
  secondaryAction?: ActionButton;
  memberNameInput?: string;
  onMemberNameInputChange?: (value: string) => void;
  onAddMember?: () => void;
  memberNames?: string[];
  onRemoveMember?: (index: number) => void;
  children?: React.ReactNode;
};

export default function EventFormScreen({
  heroTitle,
  eventName,
  onEventNameChange,
  displayName,
  onDisplayNameChange,
  displayNamePlaceholder = "あなたの名前",
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  primaryAction,
  secondaryAction,
  memberNameInput,
  onMemberNameInputChange,
  onAddMember,
  memberNames = [],
  onRemoveMember,
  children,
}: EventFormScreenProps) {
  const insets = useSafeAreaInsets();
  const showMemberFields =
    typeof memberNameInput === "string" &&
    typeof onMemberNameInputChange === "function" &&
    typeof onAddMember === "function";

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <LinearGradient
          colors={["#ea580c", "#f97316", "#afedf3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1.3 }}
          style={[
            styles.hero,
            {
              marginTop: -HERO_TOP_EXTENSION,
              minHeight: HERO_HEIGHT + HERO_TOP_EXTENSION,
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
              Paylog
            </Text>
          </View>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
          </View>
        </LinearGradient>

        <View style={styles.formContent}>
          <View style={styles.inputCard}>
            <MaterialIcons
              name="event"
              size={18}
              color="#f97316"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="イベント名を入力"
              placeholderTextColor="#94a3b8"
              value={eventName}
              onChangeText={onEventNameChange}
            />
          </View>

          <View style={styles.inputCard}>
            <MaterialIcons
              name="person-outline"
              size={18}
              color="#2563eb"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder={displayNamePlaceholder}
              placeholderTextColor="#94a3b8"
              value={displayName}
              onChangeText={onDisplayNameChange}
            />
          </View>

          {showMemberFields ? (
            <>
              <View style={styles.inputCard}>
                <MaterialIcons
                  name="group-add"
                  size={18}
                  color="#0f766e"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="参加者の名前"
                  placeholderTextColor="#94a3b8"
                  value={memberNameInput}
                  onChangeText={onMemberNameInputChange}
                  onSubmitEditing={onAddMember}
                  returnKeyType="done"
                />
              </View>

              <Pressable style={styles.addMemberButton} onPress={onAddMember}>
                <MaterialIcons name="add" size={18} color="#1d4ed8" />
                <Text style={styles.addMemberButtonText}>参加者を追加</Text>
              </Pressable>
            </>
          ) : null}

          {memberNames.length > 0 ? (
            <View style={styles.memberSection}>
              <Text style={styles.memberSectionTitle}>参加予定メンバー</Text>
              <View style={styles.memberChipList}>
                {memberNames.map((name, index) => (
                  <View key={`${name}-${index}`} style={styles.memberChip}>
                    <Text style={styles.memberChipText}>{name}</Text>
                    {onRemoveMember ? (
                      <Pressable
                        style={styles.memberChipRemove}
                        onPress={() => onRemoveMember(index)}
                      >
                        <MaterialIcons name="close" size={14} color="#64748b" />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <DateRangeCalendar
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />

          {children}

          <Pressable
            style={[
              styles.primaryButton,
              primaryAction.disabled && styles.buttonDisabled,
            ]}
            onPress={primaryAction.onPress}
            disabled={primaryAction.disabled}
          >
            <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
          </Pressable>

          {secondaryAction ? (
            <Pressable
              style={[
                styles.secondaryButton,
                secondaryAction.disabled && styles.buttonDisabled,
              ]}
              onPress={secondaryAction.onPress}
              disabled={secondaryAction.disabled}
            >
              <Text style={styles.secondaryButtonText}>
                {secondaryAction.label}
              </Text>
            </Pressable>
          ) : null}
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
    backgroundColor: "transparent",
  },
  content: {
    paddingBottom: 32,
  },
  formContent: {
    padding: 16,
    paddingTop: 22,
    gap: 12,
    backgroundColor: "#f7f6f5",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -22,
    shadowColor: "#7c8aa5",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  hero: {
    paddingHorizontal: 40,
    paddingBottom: 36,
    alignItems: "center",
    overflow: "hidden",
  },
  heroPlane: {
    position: "absolute",
    top: 16,
    right: 16,
    opacity: 0.1,
    transform: [{ rotate: "35deg" }],
    marginTop: 40,
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  heroNavText: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600",
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6,
    textAlign: "center",
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e7ecf3",
    paddingHorizontal: 16,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
    paddingVertical: 16,
  },
  addMemberButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 18,
    paddingVertical: 11,
  },
  addMemberButtonText: {
    color: "#1d4ed8",
    fontSize: 15,
    fontWeight: "600",
  },
  memberSection: {
    padding: 14,
    backgroundColor: "#ffffffcc",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  memberSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 10,
  },
  memberChipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  memberChipText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  memberChipRemove: {
    marginLeft: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2f7",
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#00bcd4",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1f6feb",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#1f6feb",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
