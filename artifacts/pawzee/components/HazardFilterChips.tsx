import React, { useMemo } from "react";
import {
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { HAZARD_CATEGORIES, HAZARD_CONFIGS, type HazardCategory } from "@/lib/hazards";
import { useResponsive, type ResponsiveUtils } from "@/lib/responsive";

interface HazardFilterChipsProps {
  activeCategory: HazardCategory | null;
  onSelect: (category: HazardCategory | null) => void;
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type IonName = React.ComponentProps<typeof Ionicons>["name"];
type MIName = React.ComponentProps<typeof MaterialIcons>["name"];

function CategoryIcon({
  category,
  size,
  isActive,
}: {
  category: HazardCategory;
  size: number;
  isActive: boolean;
}) {
  const config = HAZARD_CONFIGS[category];
  const iconColor = isActive ? "#FFF" : config.color;
  const bgColor = isActive ? "rgba(255,255,255,0.2)" : config.bgColor;
  const iconSize = size * 0.6;

  const icon = (() => {
    const props = { size: iconSize, color: iconColor };
    switch (config.iconFamily) {
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={config.iconName as MCIName} {...props} />;
      case "Ionicons":
        return <Ionicons name={config.iconName as IonName} {...props} />;
      case "MaterialIcons":
        return <MaterialIcons name={config.iconName as MIName} {...props} />;
      default:
        return <MaterialIcons name="warning" {...props} />;
    }
  })();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </View>
  );
}

export function HazardFilterChips({
  activeCategory,
  onSelect,
}: HazardFilterChipsProps) {
  const r = useResponsive();
  const styles = useMemo(() => createStyles(r), [r]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {/* "All" chip */}
      <Pressable
        style={[styles.chip, activeCategory === null && styles.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Ionicons
          name="layers-outline"
          size={r.rs(13)}
          color={activeCategory === null ? "#FFF" : Colors.textSecondary}
        />
        <Text
          style={[
            styles.chipText,
            activeCategory === null && styles.chipTextActive,
          ]}
        >
          All
        </Text>
      </Pressable>

      {HAZARD_CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat;
        return (
          <Pressable
            key={cat}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(isActive ? null : cat)}
          >
            <CategoryIcon category={cat} size={r.rs(18)} isActive={isActive} />
            <Text
              style={[styles.chipText, isActive && styles.chipTextActive]}
              numberOfLines={1}
            >
              {HAZARD_CONFIGS[cat].label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(r: ResponsiveUtils) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: r.rs(16),
      paddingVertical: 4,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: r.rs(10),
      paddingVertical: r.rs(6),
      borderRadius: 20,
      backgroundColor: Colors.mapOverlay,
      borderWidth: 1,
      borderColor: Colors.border,
      minHeight: 34,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    chipActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    chipText: {
      fontSize: r.rf(12),
      fontFamily: "Inter_500Medium",
      color: Colors.text,
    },
    chipTextActive: {
      color: "#FFF",
    },
  });
}
