import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import type { ResponsiveUtils } from "@/lib/responsive";

export function createStyles(r: ResponsiveUtils) {
  return StyleSheet.create({
    container: {
      backgroundColor: Colors.mapOverlay,
      borderRadius: 20,
      padding: r.rs(12),
      borderWidth: 1,
      borderColor: Colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    headerBadge: {
      width: r.rs(34),
      height: r.rs(34),
      borderRadius: r.rs(17),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.primaryLight,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      fontSize: r.rf(11),
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    title: {
      flex: 1,
      fontSize: r.rf(14),
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
    },
    headerActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 7,
      paddingHorizontal: 9,
      borderRadius: 12,
      backgroundColor: Colors.surfaceSecondary,
    },
    headerActionText: {
      fontSize: r.rf(12),
      fontFamily: "Inter_600SemiBold",
      color: Colors.primary,
    },
    statsRow: {
      flexDirection: "row",
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: r.rs(12),
      minHeight: r.rs(86),
    },
    activeHazardsCard: {
      borderWidth: 1,
      borderColor: Colors.primaryLight,
    },
    activeHazardsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    statNumber: {
      fontSize: r.rf(21),
      fontFamily: "Inter_700Bold",
      color: Colors.text,
    },
    statLabel: {
      fontSize: r.rf(12),
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    statMeta: {
      fontSize: r.rf(11),
      fontFamily: "Inter_400Regular",
      color: Colors.textTertiary,
      marginTop: 4,
    },
    statusText: {
      fontSize: r.rf(12),
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      marginTop: 12,
    },
    breakdownHeader: {
      marginBottom: 8,
    },
    breakdownTitle: {
      fontSize: r.rf(14),
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
    },
    breakdownSubtitle: {
      fontSize: r.rf(12),
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      marginTop: 2,
    },
    breakdownList: {
      maxHeight: r.rs(140),
    },
    breakdownContent: {
      gap: 6,
    },
    breakdownItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: Colors.surface,
      borderRadius: 14,
      paddingVertical: 8,
      paddingHorizontal: 10,
      minHeight: 44,
    },
    breakdownLabel: {
      flex: 1,
      fontSize: r.rf(14),
      fontFamily: "Inter_500Medium",
      color: Colors.text,
    },
    breakdownCountPill: {
      minWidth: r.rs(34),
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      alignItems: "center",
      backgroundColor: Colors.surfaceSecondary,
    },
    breakdownCount: {
      fontSize: r.rf(14),
      fontFamily: "Inter_700Bold",
      color: Colors.text,
    },
    emptyState: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 14,
      backgroundColor: Colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    emptyStateText: {
      flex: 1,
      fontSize: r.rf(13),
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
    },
  });
}
