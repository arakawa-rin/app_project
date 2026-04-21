import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO_TOP_EXTENSION = 40;
const HERO_HEIGHT = 150;

type SettingItem = {
  label: string;
  onPress?: () => void;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

const sections: SettingSection[] = [
  {
    title: 'アプリについて',
    items: [
      { label: 'バージョン 1.0.0' },
      { label: '利用規約' },
      { label: 'プライバシーポリシー' },
    ],
  },
  {
    title: 'その他',
    items: [
      { label: 'フィードバックを送信' },
    ],
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

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
          <Text style={[styles.heroNavText, { fontStyle: "italic" }]}>
            Paylog
          </Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.title}>設定</Text>
        </View>
      </LinearGradient>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.label}
                style={[
                  styles.row,
                  index < section.items.length - 1 && styles.rowBorder,
                ]}
                onPress={item.onPress}
              >
                <Text style={styles.rowLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f6f5',
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 40,
    height: 120,
    paddingTop: 8,
    paddingBottom: 36,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  heroNavText: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600",
  },
  heroCopy: {
    width: "100%",
    paddingLeft: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color:"#ffffffec",
    letterSpacing: -0.8,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    marginTop: -6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#5b5c5b',
    marginBottom: 8,
    paddingHorizontal: 4,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ececec',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    paddingVertical: 17,
    paddingHorizontal: 20,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e7',
  },
  rowLabel: {
    fontSize: 16,
    color: '#2e2f2f',
  },
});
