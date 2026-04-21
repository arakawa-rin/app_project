import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import {
  useIsFocused,
  useRoute,
  RouteProp,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../api/config";
import HeroBackButton from "../components/HeroBackButton";

type SettlementRouteProp = RouteProp<HomeStackParamList, "Settlement">;

const HERO_TOP_EXTENSION = 40;
const HERO_MIN_HEIGHT = 200;

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

function formatYen(amount: number) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatSignedYen(amount: number) {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}¥${Math.abs(amount).toLocaleString("ja-JP")}`;
}

export default function SettlementScreen() {
  const route = useRoute<SettlementRouteProp>();
  const { event_id } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const [settlementSummary, setSettlementSummary] = useState<
    SettlementsSummary[]
  >([]);
  const [settlements, setSettlements] = useState<Settlements[]>([]);
  const [participants, setPartcipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isFocused = useIsFocused();

  useEffect(() => {
    let cancelled = false;

    async function loadSettlements() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${BASE_URL}/api/events/${event_id}/settlements`,
          {
            credentials: "include",
          },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "精算結果の取得に失敗しました");
        }

        if (!cancelled) {
          setSettlements(data.settlements ?? []);
          setSettlementSummary(data.settlement_summary ?? []);
          setPartcipants(data.participants ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "精算結果の取得に失敗しました",
          );
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
          <HeroBackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.heroNavText, { fontStyle: "italic" }]}>
            Paylog
          </Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>精算結果</Text>
        </View>
      </LinearGradient>
      <View style={styles.settlementCard}>
        {settlementSummary.length === 0 ? (
          <Text style={styles.emptyText}>まだ精算はありません</Text>
        ) : (
          settlementSummary.map((item) => (
            <View key={item.event_participant_id} style={styles.card}>
              <View style={styles.summaryHeader}>
                <Text style={styles.name}>{item.display_name}</Text>
                <Text
                  style={[
                    styles.netAmount,
                    item.net >= 0 ? styles.netPositive : styles.netNegative,
                  ]}
                >
                  {formatSignedYen(item.net)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryColumn}>
                  <Text style={styles.summaryLabel}>立替額</Text>
                  <Text style={styles.summaryValue}>
                    {formatYen(item.total_allocations)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryColumn}>
                  <Text style={styles.summaryLabel}>支払額</Text>
                  <Text style={styles.summaryValue}>
                    {formatYen(item.total_paid)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>精算一覧</Text>
      {settlements.length === 0 ? (
        <Text style={styles.emptyText}>精算は不要です</Text>
      ) : (
        settlements.map((item, index) => (
          <View
            key={`${item.payer_display_name}-${item.payee_display_name}-${index}`}
            style={styles.transferCard}
          >
            <View style={styles.transferPerson}>
              <Text style={styles.transferLabel}>支払う人</Text>
              <Text style={styles.transferName}>{item.payer_display_name}</Text>
            </View>
            <View style={styles.transferCenter}>
              <Text style={styles.transferAmount}>{formatYen(item.amount)}</Text>
              <View style={styles.transferArrowRow}>
                <View style={styles.transferLine} />
                <MaterialIcons
                  name="trending-flat"
                  size={18}
                  color="#25687a"
                />
              </View>
            </View>
            <View style={styles.transferPerson}>
              <Text style={styles.transferLabel}>受け取る人</Text>
              <Text style={styles.transferName}>{item.payee_display_name}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {

  },
  hero: {
    width: "100%",
    minHeight: HERO_MIN_HEIGHT,
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
    marginLeft:20,
  },
  heroNavText: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 35,
    fontWeight: "700",
    marginBottom: 8,
    color:"#ffffffec",
    textAlign: "left",
  },
  titleRow: {
    width: "100%",
    alignItems: "flex-start",
  },
  caption: {
    color: "#555",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
    marginHorizontal: 35,
  },
  settlementCard:{
  marginHorizontal: 20,
  marginTop: -40,
  marginBottom: 16,
  paddingVertical: 8,
  paddingTop:30,
  backgroundColor: "#ffffff",
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    padding: 16,
    marginRight:35,
    marginLeft:35,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  transferCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  transferPerson: {
    width: 88,
    alignItems: "center",
  },
  transferLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  transferName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  transferCenter: {
    flex: 1,
    alignItems: "center",
  },
  transferAmount: {
    fontSize: 19,
    fontWeight: "700",
    color: "#25687a",
    marginBottom: 6,
  },
  transferArrowRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 6,
  },
  transferLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#cde7ec",
    borderRadius: 999,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  netAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  netPositive: {
    color: "#2e7d32",
  },
  netNegative: {
    color: "#c62828",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  summaryColumn: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e2f2f",
  },
  emptyText: {
    color: "#666",
    marginHorizontal: 35,
  },
});
