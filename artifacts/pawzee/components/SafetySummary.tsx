import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { HazardIcon } from "./HazardIcon";
import { HAZARD_CONFIGS, type HazardCategory } from "@/lib/hazards";
import type { HazardSummary } from "@/lib/api";
import { createStyles } from "./componentStyleSheet/StyleSheetSafetySummary";
import { useResponsive } from "@/lib/responsive";

interface SafetySummaryProps {
  summary: HazardSummary | null;
  locationName: string;
  loading?: boolean;
  showingSearchLocation?: boolean;
  onBackToCurrentLocation?: () => void;
  onViewChange?: (view: SummaryView) => void;
  onCategoryPress?: (category: string) => void;
}

type SummaryView = "summary" | "breakdown";

export function SafetySummaryDashboard({
  summary,
  loading = false,
  locationName,
  showingSearchLocation = false,
  onBackToCurrentLocation,
  onViewChange,
  onCategoryPress,
}: SafetySummaryProps) {
  const r = useResponsive();
  const styles = useMemo(() => createStyles(r), [r]);
  const [view, setView] = useState<SummaryView>("summary");

  useEffect(() => {
    setView("summary");
  }, [locationName, loading, summary?.hazardsToday, summary?.activeHazards]);

  useEffect(() => {
    onViewChange?.(view);
  }, [onViewChange, view]);

  const breakdownEntries = useMemo(
    () =>
      summary
        ? Object.entries(summary.breakdown).sort((a, b) => b[1] - a[1])
        : [],
    [summary],
  );

  const hasSummary = Boolean(summary);
  const reportedTodayValue = loading
    ? "..."
    : summary
      ? String(summary.hazardsToday)
      : "--";
  const activeHazardsValue = loading
    ? "..."
    : summary
      ? String(summary.activeHazards)
      : "--";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Area Summary</Text>
          <Text style={styles.title} numberOfLines={1}>
            {locationName}
          </Text>
        </View>

        {view === "breakdown" ? (
          <Pressable
            onPress={() => setView("summary")}
            style={styles.headerActionBtn}
          >
            <Ionicons name="arrow-back" size={16} color={Colors.primary} />
            <Text style={styles.headerActionText}>Back</Text>
          </Pressable>
        ) : showingSearchLocation && onBackToCurrentLocation ? (
          <Pressable
            onPress={onBackToCurrentLocation}
            style={styles.headerActionBtn}
          >
            <Ionicons name="arrow-back" size={16} color={Colors.primary} />
            <Text style={styles.headerActionText}>Current area</Text>
          </Pressable>
        ) : null}
      </View>

      {view === "summary" ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Reported Today</Text>
              <Text style={styles.statNumber}>{reportedTodayValue}</Text>
              <Text style={styles.statMeta}>New reports nearby</Text>
            </View>

            <Pressable
              style={[styles.statCard, styles.activeHazardsCard]}
              onPress={() => setView("breakdown")}
              disabled={!hasSummary || loading}
            >
              <Text style={styles.statLabel}>Active Hazards</Text>
              <View style={styles.activeHazardsRow}>
                <Text style={styles.statNumber}>{activeHazardsValue}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.statMeta}>Tap to view categories</Text>
            </Pressable>
          </View>

          {loading && (
            <Text style={styles.statusText}>Updating this area's summary...</Text>
          )}

          {!loading && !hasSummary && (
            <Text style={styles.statusText}>
              Area summary unavailable right now.
            </Text>
          )}
        </>
      ) : (
        <>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>Active hazard categories</Text>
            <Text style={styles.breakdownSubtitle}>
              {hasSummary
                ? `${summary?.activeHazards ?? 0} active hazards`
                : "No data"}
            </Text>
          </View>

          {breakdownEntries.length > 0 ? (
            <ScrollView
              style={styles.breakdownList}
              contentContainerStyle={styles.breakdownContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {breakdownEntries.map(([category, count]) => {
                const config =
                  HAZARD_CONFIGS[category as HazardCategory] ||
                  HAZARD_CONFIGS.other;

                return (
                  <Pressable
                    key={category}
                    style={({ pressed }) => [
                      styles.breakdownItem,
                      pressed && styles.breakdownItemPressed,
                    ]}
                    onPress={() => onCategoryPress?.(category)}
                    android_ripple={{ color: "rgba(26,158,143,0.12)" }}
                  >
                    <HazardIcon
                      category={category as HazardCategory}
                      size={24}
                    />
                    <Text style={styles.breakdownLabel}>{config.label}</Text>
                    <View style={styles.breakdownCountPill}>
                      <Text style={styles.breakdownCount}>{count}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="rgba(26,158,143,0.7)" />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="leaf-outline"
                size={18}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyStateText}>
                No active hazard categories in this area.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

