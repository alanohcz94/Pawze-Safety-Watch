import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
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
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  clusterContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(26, 158, 143, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  clusterInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A9E8F",
    alignItems: "center",
    justifyContent: "center",
  },
  clusterText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});

export default styles;
