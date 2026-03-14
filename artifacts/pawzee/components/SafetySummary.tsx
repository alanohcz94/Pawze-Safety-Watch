import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { HazardIcon } from "./HazardIcon";
import { HAZARD_CONFIGS, type HazardCategory } from "@/lib/hazards";
import type { HazardSummary } from "@/lib/api";
import { styles } from "./componentStyleSheet/StyleSheetSafetySummary";

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

