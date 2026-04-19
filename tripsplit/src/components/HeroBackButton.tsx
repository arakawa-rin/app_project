import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

type HeroBackButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function HeroBackButton({
  onPress,
  style,
}: HeroBackButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.icon}>←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    marginLeft: -15,
    marginRight: -15,
  },
  icon: {
    color: "#ffffffc0",
    fontSize: 25,
    fontWeight: "600",
  },
});
