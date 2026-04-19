import React from "react";
import {
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeroBackButton from "./HeroBackButton";
import SingleDateCalendar from "./SingleDateCalendar";

const HERO_TOP_EXTENSION = 40;
const HERO_HEIGHT = 170;

export type ExpenseFormParticipant = {
  event_participant_id: number;
  display_name: string;
};

type ExpenseFormScreenProps = {
  screenTitle: string;
  submitLabel: string;
  loading: boolean;
  error: string;
  participants: ExpenseFormParticipant[];
  payerEpId: number | null;
  selectedParticipants: number[];
  expenseAmount: string;
  expenseAt: string;
  categoryName: string;
  splitMethod: string;
  unitPrice: string;
  participantUnits: Record<number, string>;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  setPayerEpId: (value: number) => void;
  setExpenseAmount: (value: string) => void;
  setExpenseAt: (value: string) => void;
  setCategoryName: (value: string) => void;
  setSplitMethod: (value: string) => void;
  toggleParticipant: (value: number) => void;
  updateParticipantUnit: (id: number, value: string) => void;
  setUnitPrice: (value: string) => void;
};

function formatYen(amount: number) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export default function ExpenseFormScreen({
  screenTitle,
  submitLabel,
  loading,
  error,
  participants,
  payerEpId,
  selectedParticipants,
  expenseAmount,
  expenseAt,
  categoryName,
  splitMethod,
  unitPrice,
  participantUnits,
  submitting,
  onBack,
  onSubmit,
  setPayerEpId,
  setExpenseAmount,
  setExpenseAt,
  setCategoryName,
  setSplitMethod,
  toggleParticipant,
  updateParticipantUnit,
  setUnitPrice,
}: ExpenseFormScreenProps) {
  const insets = useSafeAreaInsets();
  const parsedExpenseAmount = Number(expenseAmount);
  const parsedUnitPrice = Number(unitPrice);
  const hasExpenseAmount =
    expenseAmount.trim() !== "" && Number.isFinite(parsedExpenseAmount);
  const hasUnitPrice =
    unitPrice.trim() !== "" && Number.isFinite(parsedUnitPrice);
  const totalUnits = selectedParticipants.reduce((sum, id) => {
    const units = Number.parseInt(participantUnits[id] ?? "0", 10);
    return sum + (Number.isFinite(units) ? Math.max(units, 0) : 0);
  }, 0);
  const computedAmount =
    hasUnitPrice && totalUnits > 0 ? parsedUnitPrice * totalUnits : 0;
  const divisibleByUnitPrice =
    hasExpenseAmount &&
    hasUnitPrice &&
    parsedUnitPrice > 0 &&
    Number.isInteger(parsedExpenseAmount / parsedUnitPrice);
  const remainingAmount =
    hasExpenseAmount && hasUnitPrice ? parsedExpenseAmount - computedAmount : 0;
  const remainingUnits =
    divisibleByUnitPrice && parsedUnitPrice > 0
      ? remainingAmount / parsedUnitPrice
      : null;
  const unitSummaryTone =
    !hasExpenseAmount || !hasUnitPrice
      ? "neutral"
      : remainingAmount === 0
        ? "success"
        : remainingAmount > 0
          ? "info"
          : "warning";
  const unitSummaryTitle =
    !hasExpenseAmount || !hasUnitPrice
      ? "入力待ち"
      : remainingAmount === 0
        ? "一致"
        : remainingAmount > 0
          ? "不足"
          : "超過";
  const unitSummaryMessage =
    !hasExpenseAmount || !hasUnitPrice
      ? "支出金額と1口単価を入力すると自動計算されます"
      : remainingAmount === 0
        ? "口数と金額が一致しています"
        : remainingAmount > 0
          ? divisibleByUnitPrice
            ? `あと${remainingUnits}口で一致します`
            : `あと${formatYen(remainingAmount)}不足しています。1口単価の見直しが必要です`
          : divisibleByUnitPrice
            ? `${Math.abs(remainingUnits ?? 0)}口分オーバーしています`
            : `${formatYen(Math.abs(remainingAmount))}オーバーしています。1口単価の見直しが必要です`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <HeroBackButton onPress={onBack} />
          <Text style={[styles.heroNavText, { fontStyle: "italic" }]}>
            TripSplit
          </Text>
        </View>
        <Text style={styles.heroTitle}>{screenTitle}</Text>
      </LinearGradient>
      {loading ? (
        <Text style={styles.infoText}>参加者を読み込み中...</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.inputCard}>
        <View style={styles.amountInputRow}>
          <Text style={styles.currencyMark}>¥</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="金額入力"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            keyboardType="numeric"
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="費目(交通費/ホテル代)"
          value={categoryName}
          onChangeText={setCategoryName}
        />
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>支出日</Text>
        <SingleDateCalendar
          date={expenseAt}
          onDateChange={setExpenseAt}
          title=""
          label="選択日"
        />
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>割り方</Text>
        <View style={styles.splitMethodRow}>
          <Pressable
            style={[
              styles.splitMethodButton,
              splitMethod === "EQUAL" && styles.optionButtonSelected,
            ]}
            onPress={() => setSplitMethod("EQUAL")}
          >
            <Text
              style={[
                styles.optionText,
                splitMethod === "EQUAL" && styles.optionTextSelected,
              ]}
            >
              割り勘
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.splitMethodButton,
              splitMethod === "UNITS" && styles.optionButtonSelected,
            ]}
            onPress={() => setSplitMethod("UNITS")}
          >
            <Text
              style={[
                styles.optionText,
                splitMethod === "UNITS" && styles.optionTextSelected,
              ]}
            >
              口数割
            </Text>
          </Pressable>
        </View>
      </View>
      {splitMethod === "UNITS" ? (
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>1口単価</Text>
          <TextInput
            style={styles.unitInputBox}
            placeholder="1口単価"
            value={unitPrice}
            onChangeText={setUnitPrice}
            keyboardType="numeric"
          />
          <Text style={styles.unitHint}>
            負担者ごとに口数を入力してください
          </Text>
        </View>
      ) : null}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>立替人</Text>
        {participants.map((participant) => (
          <Pressable
            key={`payer-${participant.event_participant_id}`}
            style={[
              styles.optionButton,
              payerEpId === participant.event_participant_id &&
                styles.optionButtonSelected,
            ]}
            onPress={() => setPayerEpId(participant.event_participant_id)}
          >
            <Text
              style={[
                styles.optionText,
                payerEpId === participant.event_participant_id &&
                  styles.optionTextSelected,
              ]}
            >
              {payerEpId === participant.event_participant_id ? "●" : "○"}{" "}
              {participant.display_name}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>負担者</Text>
        {participants.map((participant) => {
          const selected = selectedParticipants.includes(
            participant.event_participant_id,
          );

          return (
            <Pressable
              key={`participant-${participant.event_participant_id}`}
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
                {selected ? "☑" : "☐"} {participant.display_name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {splitMethod === "UNITS" ? (
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>口数</Text>
          {participants
            .filter((participant) =>
              selectedParticipants.includes(participant.event_participant_id),
            )
            .map((participant) => (
              <TextInput
                key={`unit-${participant.event_participant_id}`}
                style={styles.unitInput}
                placeholder={`${participant.display_name} の口数`}
                value={participantUnits[participant.event_participant_id] ?? ""}
                onChangeText={(value) =>
                  updateParticipantUnit(participant.event_participant_id, value)
                }
                keyboardType="numeric"
              />
            ))}
          <View
            style={[
              styles.unitSummaryCard,
              unitSummaryTone === "success"
                ? styles.unitSummarySuccess
                : unitSummaryTone === "warning"
                  ? styles.unitSummaryWarning
                  : unitSummaryTone === "info"
                    ? styles.unitSummaryInfo
                    : styles.unitSummaryNeutral,
            ]}
          >
            <Text
              style={[
                styles.unitSummaryBadge,
                unitSummaryTone === "success"
                  ? styles.unitSummaryBadgeSuccess
                  : unitSummaryTone === "warning"
                    ? styles.unitSummaryBadgeWarning
                    : unitSummaryTone === "info"
                      ? styles.unitSummaryBadgeInfo
                      : styles.unitSummaryBadgeNeutral,
              ]}
            >
              {unitSummaryTitle}
            </Text>
            <View style={styles.unitSummaryMainRow}>
              <View style={styles.unitSummaryMetric}>
                <Text style={styles.unitSummaryLabel}>現在の合計</Text>
                <Text style={styles.unitSummaryValue}>
                  {hasUnitPrice ? formatYen(computedAmount) : "¥0"}
                </Text>
              </View>
              <View style={styles.unitSummaryMetric}>
                <Text style={styles.unitSummaryLabel}>口数</Text>
                <Text style={styles.unitSummaryValue}>{totalUnits}口</Text>
              </View>
            </View>
            <Text style={styles.unitSummaryMessage}>{unitSummaryMessage}</Text>
          </View>
        </View>
      ) : null}
      <Button title={submitLabel} onPress={onSubmit} disabled={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5f5",
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 40,
    paddingBottom: 36,
    alignItems: "center",
    overflow: "hidden",
  },
  heroPlane: {
    position: "absolute",
    marginTop: 50,
    right: 16,
    opacity: 0.1,
    transform: [{ rotate: "35deg" }],
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    marginLeft: 20,
  },
  heroNavText: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#ffffffec",
    textAlign: "center",
  },
  infoText: {
    marginBottom: 12,
    color: "#555",
    marginHorizontal: 16,
  },
  errorText: {
    marginBottom: 12,
    color: "#b00020",
    marginHorizontal: 16,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    padding: 20,
    marginTop: -30,
    marginRight: 16,
    marginLeft: 16,
    backgroundColor: "#ffffff",
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9dee7",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 15,
    fontSize: 17,
    color: "#111827",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d9dee7",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    minHeight: 56,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  currencyMark: {
    fontSize: 22,
    color: "#6b7280",
    marginRight: 8,
    fontWeight: "600",
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 17,
    color: "#111827",
  },
  splitMethodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 0,
  },
  splitMethodButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionButtonSelected: {
    borderColor: "#1f6feb",
    backgroundColor: "#eaf2ff",
  },
  optionText: {
    fontSize: 16,
    color: "#222",
    marginLeft: 12,
    marginRight: 12,
  },
  optionTextSelected: {
    color: "#1f4fbf",
    fontWeight: "600",
  },
  unitInputBox: {
    height: 52,
    borderWidth: 1,
    borderColor: "#d9dee7",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    marginBottom: 10,
    paddingHorizontal: 16,
    fontSize: 17,
    color: "#111827",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  unitHint: {
    marginBottom: 12,
    color: "#6b7280",
    fontSize: 13,
  },
  unitInput: {
    borderWidth: 1,
    borderColor: "#d9dee7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  unitSummaryCard: {
    marginTop: 6,
    marginBottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  unitSummaryNeutral: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  unitSummaryInfo: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  unitSummarySuccess: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  unitSummaryWarning: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
  },
  unitSummaryBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  unitSummaryBadgeNeutral: {
    backgroundColor: "#e2e8f0",
    color: "#475569",
  },
  unitSummaryBadgeInfo: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  unitSummaryBadgeSuccess: {
    backgroundColor: "#d1fae5",
    color: "#047857",
  },
  unitSummaryBadgeWarning: {
    backgroundColor: "#fed7aa",
    color: "#c2410c",
  },
  unitSummaryMainRow: {
    flexDirection: "row",
    gap: 12,
  },
  unitSummaryMetric: {
    flex: 1,
    backgroundColor: "#ffffffb8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  unitSummaryLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  unitSummaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  unitSummaryMessage: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
});
