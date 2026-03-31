import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import type { ResponsiveUtils } from "@/lib/responsive";

export function createStyles(r: ResponsiveUtils) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      flex: 1,
      backgroundColor: Colors.overlay,
    },
    sheet: {
      backgroundColor: Colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: r.rs(40),
      maxHeight: r.isTablet ? "55%" : "70%",
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.border,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: r.rs(20),
      gap: 10,
    },
    emergencyBadge: {
      width: r.rs(36),
      height: r.rs(36),
      borderRadius: r.rs(18),
      backgroundColor: Colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetTitle: {
      flex: 1,
      fontSize: r.rf(20),
      fontFamily: "Inter_700Bold",
      color: Colors.text,
    },
    closeBtn: {
      width: r.rs(36),
      height: r.rs(36),
      borderRadius: r.rs(18),
      backgroundColor: Colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetSubtitle: {
      fontSize: r.rf(13),
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      paddingHorizontal: r.rs(20),
      marginTop: 4,
      marginBottom: 16,
    },
    loaderContainer: {
      alignItems: "center",
      paddingVertical: 40,
      gap: 12,
    },
    loaderText: {
      fontSize: r.rf(14),
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    listContent: {
      paddingHorizontal: r.rs(20),
      gap: 12,
      paddingBottom: 20,
    },
    vetCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surfaceSecondary,
      borderRadius: 14,
      padding: r.rs(14),
      gap: 12,
    },
    vetIconContainer: {
      width: r.rs(44),
      height: r.rs(44),
      borderRadius: 12,
      backgroundColor: Colors.accentLight,
      alignItems: "center",
      justifyContent: "center",
    },
    vetInfo: {
      flex: 1,
    },
    vetNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    vetName: {
      fontSize: r.rf(15),
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
      flexShrink: 1,
    },
    emergencyTag: {
      backgroundColor: Colors.accent,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    emergencyTagText: {
      fontSize: r.rf(10),
      fontFamily: "Inter_700Bold",
      color: "#FFF",
    },
    vetAddress: {
      fontSize: r.rf(12),
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      marginTop: 2,
    },
    vetDistance: {
      fontSize: r.rf(12),
      fontFamily: "Inter_500Medium",
      color: Colors.primary,
      marginTop: 2,
    },
    vetActions: {
      flexDirection: "row",
      gap: 6,
    },
    vetActionBtn: {
      width: Math.max(r.rs(34), 44),
      height: Math.max(r.rs(34), 44),
      borderRadius: Math.max(r.rs(17), 22),
      alignItems: "center",
      justifyContent: "center",
    },
    callBtn: {
      backgroundColor: "#E8F8F0",
    },
    callBtnDisabled: {
      backgroundColor: Colors.surfaceSecondary,
      opacity: 0.5,
    },
    navBtn: {
      backgroundColor: Colors.primaryLight,
    },
    searchMapsBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: r.rs(14),
      marginTop: 8,
      borderRadius: 12,
      backgroundColor: Colors.primaryLight,
      minHeight: 48,
    },
    searchMapsText: {
      fontSize: r.rf(14),
      fontFamily: "Inter_600SemiBold",
      color: Colors.primary,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
      gap: 12,
    },
    emptyText: {
      fontSize: r.rf(16),
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    emptySubtext: {
      fontSize: r.rf(13),
      fontFamily: "Inter_400Regular",
      color: Colors.textTertiary,
    },
  });
}
