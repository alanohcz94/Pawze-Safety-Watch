import { Platform, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import type { ResponsiveUtils } from "@/lib/responsive";

export function createStyles(r: ResponsiveUtils) {
  return StyleSheet.create({
    triggerContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.mapOverlay,
      borderRadius: 20,
      paddingLeft: r.rs(16),
      paddingRight: 8,
      height: r.rs(52),
      borderWidth: 1,
      borderColor: Colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    triggerPressable: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
    },
    triggerIcon: {
      marginRight: 10,
    },
    triggerText: {
      flex: 1,
      fontSize: r.rf(15),
      fontFamily: "Inter_400Regular",
      color: Colors.textTertiary,
    },
    triggerTextFilled: {
      color: Colors.text,
    },
    triggerDivider: {
      width: 1,
      height: 24,
      marginHorizontal: 8,
      backgroundColor: Colors.border,
    },
    trailingActionBtn: {
      width: Math.max(r.rs(36), 44),
      height: Math.max(r.rs(36), 44),
      borderRadius: Math.max(r.rs(18), 22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.primaryLight,
    },
    trailingActionBtnDisabled: {
      opacity: 0.55,
    },
    overlayContainer: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    overlayHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    overlayBackBtn: {
      width: r.rs(40),
      height: r.rs(40),
      borderRadius: r.rs(20),
      alignItems: "center",
      justifyContent: "center",
    },
    overlayInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surfaceSecondary,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: r.rs(44),
      gap: 8,
    },
    overlayInput: {
      flex: 1,
      fontSize: r.rf(16),
      fontFamily: "Inter_400Regular",
      color: Colors.text,
      ...(Platform.OS === "web"
        ? ({ outlineStyle: "none" } as Record<string, string>)
        : {}),
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
    },
    loadingText: {
      fontSize: r.rf(14),
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    suggestionsList: {
      paddingHorizontal: r.rs(16),
      paddingTop: 8,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      minHeight: 44,
    },
    suggestionText: {
      flex: 1,
      fontSize: r.rf(15),
      fontFamily: "Inter_500Medium",
      color: Colors.text,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: r.rf(14),
      fontFamily: "Inter_400Regular",
      color: Colors.textTertiary,
    },
  });
}
