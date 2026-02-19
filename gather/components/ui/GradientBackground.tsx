import { View, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function GradientBackground() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={
          isDark
            ? ["rgba(130,80,220,0.22)", "rgba(80,60,200,0.10)", "rgba(0,0,0,0)"]
            : [
                "rgba(130,80,220,0.13)",
                "rgba(80,60,200,0.06)",
                "rgba(255,255,255,0)",
              ]
        }
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
    </View>
  );
}
