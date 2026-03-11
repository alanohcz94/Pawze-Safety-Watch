import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { HazardIcon } from "./HazardIcon";
import type { HazardItem } from "@/lib/api";
import type { HazardCategory } from "@/lib/hazards";

interface HazardMarkerProps {
  hazard: HazardItem;
  onPress: (hazard: HazardItem) => void;
}

export function HazardMarker({ hazard, onPress }: HazardMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: hazard.lat, longitude: hazard.lng }}
      onPress={() => onPress(hazard)}
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
        <HazardIcon category={hazard.category as HazardCategory} size={36} />
        {hazard.confirmationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{hazard.confirmationCount}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

interface ClusterMarkerProps {
  count: number;
  coordinate: { latitude: number; longitude: number };
  onPress: () => void;
}

export function ClusterMarker({ count, coordinate, onPress }: ClusterMarkerProps) {
  return (
    <Marker coordinate={coordinate} onPress={onPress} tracksViewChanges={false}>
      <View style={styles.clusterContainer}>
        <View style={styles.clusterInner}>
          <Text style={styles.clusterText}>{count}</Text>
        </View>
      </View>
    </Marker>
  );
}

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
