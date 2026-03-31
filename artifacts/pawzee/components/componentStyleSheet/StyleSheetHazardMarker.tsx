import { StyleSheet } from "react-native";
import type { ResponsiveUtils } from "@/lib/responsive";

export function createStyles(r: ResponsiveUtils) {
  return StyleSheet.create({
    markerContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -8,
      backgroundColor: "#1A9E8F",
      borderRadius: 8,
      minWidth: r.rs(16),
      height: r.rs(16),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeText: {
      color: "#FFF",
      fontSize: r.rf(9),
      fontFamily: "Inter_700Bold",
    },
    clusterContainer: {
      width: r.rs(48),
      height: r.rs(48),
      borderRadius: r.rs(24),
      backgroundColor: "rgba(26, 158, 143, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    clusterInner: {
      width: r.rs(36),
      height: r.rs(36),
      borderRadius: r.rs(18),
      backgroundColor: "#1A9E8F",
      alignItems: "center",
      justifyContent: "center",
    },
    clusterText: {
      color: "#FFF",
      fontSize: r.rf(14),
      fontFamily: "Inter_700Bold",
    },
  });
}
