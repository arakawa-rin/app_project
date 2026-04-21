import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../api/config';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";



type Event = {
  event_id: number;
  event_name: string;
  start_date: string;
  end_date: string;
};

export default function EventListScreen() {
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'created' | 'joined'>('created');
  const [createdExpanded, setCreatedExpanded] = useState(false);
  const [joinedExpanded, setJoinedExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [error, setError] = useState('');
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const COLLAPSE_LIMIT = 5;

  useEffect(() => {
    let cancelled = false;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadEvents() {
      setLoading(true);
      setShowLoadingIndicator(false);
      setError('');
      loadingTimer = setTimeout(() => {
        if (!cancelled) {
          setShowLoadingIndicator(true);
        }
      }, 300);

      try {
        const response = await fetch(`${BASE_URL}/api/events`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'イベント一覧の取得に失敗しました');
        }

        if (!cancelled) {
          setCreatedEvents(data.created_events ?? []);
          setJoinedEvents(data.joined_events ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setCreatedEvents([]);
          setJoinedEvents([]);
          setError(err instanceof Error ? err.message : '通信エラーが発生しました');
        }
      } finally {
        if (loadingTimer) {
          clearTimeout(loadingTimer);
        }
        if (!cancelled) {
          setLoading(false);
          setShowLoadingIndicator(false);
        }
      }
    }

    loadEvents();

    return () => {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
      cancelled = true;
    };
  }, [isFocused]);

  const events = activeTab === 'created' ? createdEvents : joinedEvents;
  const isExpanded = activeTab === 'created' ? createdExpanded : joinedExpanded;
  const visibleEvents = isExpanded ? events : events.slice(0, COLLAPSE_LIMIT);
  const emptyMessage =
    activeTab === 'created'
      ? '作成したイベントはまだありません'
      : '参加中のイベントはまだありません';



  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        <LinearGradient
          colors={["#ea580c", "#f97316", "#afedf3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1.3 }}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          <MaterialIcons name="flight" size={120} color="#fff" style={styles.heroPlane} />
          <View style={styles.heroNav}>
            <Text style={[styles.heroNavText, { fontStyle: "italic"}]}>Paylog</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>イベント一覧</Text>
            <Text style={styles.heroSubtitle}>~楽しい思い出の精算を管理~</Text>
          </View>
        </LinearGradient>
      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tabButton,
            activeTab === 'created' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('created')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'created' && styles.tabButtonTextActive,
            ]}
          >
            作成したイベント
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tabButton,
            activeTab === 'joined' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('joined')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'joined' && styles.tabButtonTextActive,
            ]}
          >
            参加中のイベント
          </Text>
        </Pressable>
      </View>
      {loading && showLoadingIndicator ? <Text>読み込み中...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && events.length === 0 ? (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      ) : null}
        {visibleEvents.map((event) => {
          const displayEventName =
            event.event_name.length > 15
              ? `${event.event_name.slice(0, 15)}...`
              : event.event_name;

          return (
        <Pressable
          key={event.event_id}
          style={styles.eventCard}
          onPress={() => navigation.navigate('EventDetail', { event_id: event.event_id })}
        >
          <Text style={styles.eventName}>{displayEventName}</Text>
          <View style={styles.eventMetaRow}>
            <MaterialIcons name="date-range" size={16} color="#29c280" />
            <Text style={styles.eventDate}>
              {new Date(event.start_date).toLocaleDateString()} 〜 {new Date(event.end_date).toLocaleDateString()}
            </Text>
          </View>
        </Pressable>
          );
      })}
      {events.length > COLLAPSE_LIMIT ? (
        <Pressable
          style={styles.collapseButton}
          onPress={() =>
            activeTab === 'created'
              ? setCreatedExpanded((current) => !current)
              : setJoinedExpanded((current) => !current)
          }
        >
          <Text style={styles.collapseButtonText}>
            {isExpanded ? '折りたたむ' : `さらに${events.length - COLLAPSE_LIMIT}件を表示`}
          </Text>
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={18}
            color="#1f6feb"
          />
        </Pressable>
      ) : null}
      
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f6f5',
  },
  content: {   

  },
  hero: {
    width: "100%",
    minHeight: 160,
    paddingHorizontal: 32,
    paddingBottom: 24,
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
  heroCopy: {
    width: "100%",
    alignItems: "flex-start",
    paddingTop: 3,
  },
  heroNavText: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600", 
  },
  heroNavButton: {
    padding: 8,
    marginLeft: -15,
    marginRight: -15,
  }, 
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    textAlign: 'left',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },
  tabs: {
    position: 'relative',
    marginTop: -16,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#f97316',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5b5c5b',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  emptyText: {
    marginHorizontal: 20,
    marginTop: 20,
    color: '#5b5c5b',
    fontSize: 15,
  },
  eventCard: {
    marginRight: 20,
    marginLeft: 20,
    marginTop: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    paddingTop: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#ffffff",
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
  eventName: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDate: {
    fontSize: 14,
    color: '#5b5c5b',
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 12,
    color: '#1f6feb',
  },
  collapseButtonText: {
    fontSize: 13,
    color: '#1f6feb',
    fontWeight: '600',
  },
});
