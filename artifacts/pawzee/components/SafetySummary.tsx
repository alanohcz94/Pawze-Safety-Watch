import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { HazardIcon } from "./HazardIcon";
import { HAZARD_CONFIGS, type HazardCategory } from "@/lib/hazards";
import type { HazardSummary } from "@/lib/api";

interface SafetySummaryProps {
  summary: HazardSummary | null;
  visible: boolean;
  onClose: () => void;
  locationName?: string;
}

export function SafetySummaryOverlay({
  summary,
  visible,
  onClose,
  locationName,
}: SafetySummaryProps) {
  if (!visible || !summary) return null;

  const breakdownEntries = Object.entries(summary.breakdown).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
        <Text style={styles.title}>
          {locationName ? `${locationName}` : "Area Safety"}
        </Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{summary.hazardsToday}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{summary.activeHazards}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {breakdownEntries.length > 0 && (
        <View style={styles.breakdown}>
          {breakdownEntries.map(([category, count]) => {
            const config = HAZARD_CONFIGS[category as HazardCategory] || HAZARD_CONFIGS.other;
            return (
              <View key={category} style={styles.breakdownItem}>
                <HazardIcon category={category as HazardCategory} size={24} />
                <Text style={styles.breakdownLabel}>{config.label}</Text>
                <Text style={styles.breakdownCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  breakdown: {
    gap: 8,
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  breakdownCount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
});
