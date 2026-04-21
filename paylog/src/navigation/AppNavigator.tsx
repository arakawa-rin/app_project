import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import HomeStack from "./HomeStack";
import CreateStack from "./CreateStack";
import SettingsStack from "./SettingsStack";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      id="AppTabs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 80,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#ffffffee",
        },
        tabBarActiveTintColor: "#964300",
        tabBarInactiveTintColor: "#78716c",
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 1,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: "イベント一覧",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateStack}
        options={{
          tabBarLabel: "",
          tabBarButton: ({ onPress, accessibilityState }) => {
            const focused = accessibilityState?.selected ?? false;

            return (
              <View style={styles.centerTabWrap}>
                <Pressable
                  onPress={onPress}
                  style={({ pressed }) => [
                    styles.centerTabButton,
                    pressed && styles.centerTabButtonPressed,
                    focused && styles.centerTabButtonFocused,
                  ]}
                >
                  <LinearGradient
                    colors={["#00bcd4", "#2196f3"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.centerTabGradient}
                  >
                    <MaterialIcons name="add" size={24} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: "設定",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerTabWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerTabButton: {
    borderRadius: 999,
  },
  centerTabButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  centerTabButtonFocused: {
    shadowColor: "#2196f3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  centerTabGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2196f3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
});
