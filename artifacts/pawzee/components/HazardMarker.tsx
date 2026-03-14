import React from "react";
import { View, Text } from "react-native";
import { Marker } from "react-native-maps";
import { HazardIcon } from "./HazardIcon";
import type { HazardItem } from "@/lib/api";
import type { HazardCategory } from "@/lib/hazards";
import { styles } from "./componentStyleSheet/StyleSheetHazardMarker";

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

