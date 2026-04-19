import React, { useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useIsFocused,
  useRoute,
  RouteProp,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { MaterialIcons } from "@expo/vector-icons";
import { BASE_URL } from "../api/config";
import * as Clipboard from "expo-clipboard";
import HeroBackButton from "../components/HeroBackButton";

type EventDetailRouteProp = RouteProp<HomeStackParamList, "EventDetail">;

type EventDetail = {
  event: {
    event_id: number;
    event_name: string;
    start_date: string;
    end_date: string;
    invite_code: string;
  };

  participants: {
    event_participant_id: number;
    display_name: string;
  }[];

  expenses: {
    expense_id: number;
    expense_amount: string;
    expense_at: string;
    category_name: string | null;
    payer_ep_id: number;
    payer_name: string;
  }[];

  my_ep_id: number | null;
};

export default function EventDetailScreen() {
  const route = useRoute<EventDetailRouteProp>();
  const { event_id } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isFocused = useIsFocused();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<
    "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
  >("date_desc");
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const COLLAPSE_LIMIT = 4;

  async function handleLeave() {
    Alert.alert(
      "イベント退出",
      "本当にこのイベントを退出しますか？",
      [
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
      ],
      { cancelable: true },
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
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
          setDetails(data);
        }
      } catch (err) {
        if (!cancelled) {
          setDetails(null);
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

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [event_id, isFocused]);

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View>
        <Text>イベント情報がありません</Text>
      </View>
    );
  }

  const displayEventName =
    details.event.event_name.length > 8
      ? `${details.event.event_name.slice(0, 8)}...`
      : details.event.event_name;

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
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
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
              TripSplit
            </Text>
            <Pressable onPress={handleLeave} style={styles.heroNavButton}>
              <MaterialIcons name="exit-to-app" size={30} color="#fff" />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.heroTitle}>{displayEventName}</Text>
            <MaterialIcons.Button
              name="create"
              backgroundColor="transparent"
              underlayColor="transparent"
              style={styles.heroEditButton}
              onPress={() =>
                navigation.navigate("EventEdit", {
                  event_id,
                  event_participant_id: details.my_ep_id ?? 0,
                })
              }
            />
          </View>
          <Text style={styles.heroDate}>
            {new Date(details.event.start_date).toLocaleDateString("ja-JP")} 〜{" "}
            {new Date(details.event.end_date).toLocaleDateString("ja-JP")}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <Pressable
            style={styles.Invite}
            onPress={async () => {
              await Clipboard.setStringAsync(details.event.invite_code);
              Alert.alert(
                "コピーしました",
                `招待コード: ${details.event.invite_code}`,
              );
            }}
          >
            <Text style={{ fontSize: 17, flex: 1 }}>
              招待コード: {details.event.invite_code}
            </Text>
            <MaterialIcons name="content-copy" size={18} color="#5b5c5b" />
          </Pressable>
          <Text style={styles.section}>参加者</Text>
          <View style={styles.participantsList}>
            {(participantsExpanded
              ? details.participants
              : details.participants.slice(0, COLLAPSE_LIMIT)
            ).map((participant) => (
              <View
                key={participant.event_participant_id}
                style={styles.memberChip}
              >
                <Text style={styles.memberChipText}>
                  {participant.display_name}
                </Text>
              </View>
            ))}
          </View>
          {details.participants.length >= COLLAPSE_LIMIT && (
            <Pressable
              style={styles.collapseButton}
              onPress={() => setParticipantsExpanded((v) => !v)}
            >
              <Text style={styles.collapseButtonText}>
                {participantsExpanded
                  ? "折りたたむ"
                  : `さらに${details.participants.length - COLLAPSE_LIMIT}人を表示`}
              </Text>
              <MaterialIcons
                name={participantsExpanded ? "expand-less" : "expand-more"}
                size={18}
                color="#1f6feb"
              />
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate("ExpenseAdd", { event_id })}
            >
              <Text style={styles.primaryButtonText}>支出を追加</Text>
            </Pressable>
          </View>

          <Text style={styles.section}>最近の支出</Text>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={18} color="#5b5c5b" />
              <TextInput
                style={styles.searchInput}
                placeholder="カテゴリ・支払者で検索"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <MaterialIcons name="close" size={16} color="#999" />
                </Pressable>
              )}
            </View>
            <Pressable
              style={styles.sortButton}
              onPress={() => {
                const orders: (typeof sortOrder)[] = [
                  "date_desc",
                  "date_asc",
                  "amount_desc",
                  "amount_asc",
                ];
                const next =
                  orders[(orders.indexOf(sortOrder) + 1) % orders.length];
                setSortOrder(next);
              }}
            >
              <MaterialIcons name="sort" size={20} color="#1f6feb" />
              <Text style={styles.sortLabel}>
                {sortOrder === "date_desc"
                  ? "日付↓"
                  : sortOrder === "date_asc"
                    ? "日付↑"
                    : sortOrder === "amount_desc"
                      ? "金額↓"
                      : "金額↑"}
              </Text>
            </Pressable>
          </View>

          {(() => {
            const filtered = [...details.expenses]
              .filter(
                (e) =>
                  (e.category_name ?? "カテゴリなし").includes(searchQuery) ||
                  e.payer_name.includes(searchQuery),
              )
              .sort((a, b) => {
                if (sortOrder === "date_desc")
                  return (
                    new Date(b.expense_at).getTime() -
                    new Date(a.expense_at).getTime()
                  );
                if (sortOrder === "date_asc")
                  return (
                    new Date(a.expense_at).getTime() -
                    new Date(b.expense_at).getTime()
                  );
                if (sortOrder === "amount_desc")
                  return (
                    parseFloat(b.expense_amount) - parseFloat(a.expense_amount)
                  );
                return (
                  parseFloat(a.expense_amount) - parseFloat(b.expense_amount)
                );
              });
            const visible = expensesExpanded
              ? filtered
              : filtered.slice(0, COLLAPSE_LIMIT);
            return (
              <>
                {visible.map((expense) => (
                  (() => {
                    const categoryName = expense.category_name || "カテゴリなし";
                    const displayCategory =
                      categoryName.length > 8
                        ? `${categoryName.slice(0, 8)}...`
                        : categoryName;

                    return (
                      <View key={expense.expense_id} style={styles.expenseCard}>
                        <View style={styles.leftAccent} />
                        <View style={styles.expenseMain}>
                          <View style={styles.expenseHeader}>
                            <Text style={styles.expenseCategory}>
                              {displayCategory}
                            </Text>
                            <Text style={styles.expenseAmount}>
                              ¥{parseInt(expense.expense_amount).toLocaleString()}
                            </Text>
                          </View>
                          <View style={styles.expenseMetaRow}>
                            <View style={styles.memberPayerChip}>
                              <Text style={styles.memberChipText}>
                                {expense.payer_name}
                              </Text>
                            </View>
                            <Text style={styles.expenseSubCategory}>
                              {new Date(expense.expense_at).toLocaleDateString(
                                "ja-JP",
                              )}
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          style={styles.expenseEditButton}
                          onPress={() =>
                            navigation.navigate("ExpenseEdit", {
                              event_id,
                              expense_id: expense.expense_id,
                            })
                          }
                        >
                          <MaterialIcons
                            name="edit"
                            size={20}
                            color="#5b5c5b"
                          />
                        </Pressable>
                      </View>
                    );
                  })()
                ))}
                {filtered.length >= COLLAPSE_LIMIT && (
                  <Pressable
                    style={styles.collapseButton}
                    onPress={() => setExpensesExpanded((v) => !v)}
                  >
                    <Text style={styles.collapseButtonText}>
                      {expensesExpanded
                        ? "折りたたむ"
                        : `さらに${filtered.length - COLLAPSE_LIMIT}件を表示`}
                    </Text>
                    <MaterialIcons
                      name={expensesExpanded ? "expand-less" : "expand-more"}
                      size={18}
                      color="#1f6feb"
                    />
                  </Pressable>
                )}
              </>
            );
          })()}

          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("Settlement", { event_id })}
            >
              <Text style={styles.secondaryButtonText}>精算を見る</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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

  hero: {
    paddingHorizontal: 40,
    height: 200,
    paddingTop: 8,
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
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
    marginRight: -10,
  },
  heroNavButton: {
    padding: 8,
    marginLeft: -15,
    marginRight: -15,
  },
  heroNavText: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "bold",
    marginLeft: 30,
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
  },
  heroEditButton: {
    marginRight: 8,
    color: "transparent",
    padding: 0,
    borderWidth: 0,
    elevation: 0,
    fontSize: 10,
    backgroundColor: "transparent",
  },
  heroDate: {
    fontSize: 17,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  body: {
    paddingHorizontal: 17,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  Invite: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
    borderBottomWidth: 1,
    borderRadius: 8,
    backgroundColor: "#fcfcfd",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderColor: "#bebec3",
  },
  actions: {
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  primaryButton: {
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
    borderWidth: 1,
    borderColor: "#809ac2",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#1f6feb",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  participantsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: 8,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  memberChipText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 17,
    marginBottom: 10,
    marginLeft: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#eeeff1",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: "hidden",
  },
  expenseMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  expenseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  leftAccent: {
    position: "absolute",
    left: 0,
    top: 2,
    bottom: 0,
    width: 4,
    backgroundColor: "#33684b",
  },
  expenseCategory: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    marginLeft: 10,
    color: "#464646",
  },
  expenseAmount: {
    flexShrink: 0,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    marginLeft: 10,
    color: "#464646",
    textAlign: "right",
  },
  expenseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  memberPayerChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 5,
    paddingBottom: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  expenseSubCategory: {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
    marginTop: 7,
  },
  expenseEditButton: {
    padding: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  expenseHint: {
    marginTop: 6,
    color: "#666",
    fontSize: 12,
  },
  collapseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  collapseButtonText: {
    fontSize: 13,
    color: "#1f6feb",
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#2e2f2f",
    padding: 0,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  sortLabel: {
    fontSize: 12,
    color: "#1f6feb",
    fontWeight: "600",
  },
});
