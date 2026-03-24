import React from "react";
import { View, Text } from "react-native";
import { styles } from "./componentStyleSheet/StyleSheetMapViewWrapperWeb";

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
