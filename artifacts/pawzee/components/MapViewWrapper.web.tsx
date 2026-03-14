import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const MapViewWrapper = React.forwardRef<any, MapViewWrapperProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.inner}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.title}>Pawzee Map</Text>
          <Text style={styles.subtitle}>
            Open in Expo Go on your phone to see the live map
          </Text>
          <Text style={styles.hint}>
            Scan the QR code in the terminal with the Expo Go app
          </Text>
        </View>
      </View>
    );
  },
);

MapViewWrapper.displayName = "MapViewWrapper";

export default MapViewWrapper;

export const Marker = View;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A9E8F",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 280,
  },
  hint: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 260,
  },
});
