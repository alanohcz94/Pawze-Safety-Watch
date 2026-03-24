import React from "react";
import { View, Text } from "react-native";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  style?: any;
  [key: string]: any;
}

const MapViewWrapper = React.forwardRef<any, MapViewWrapperProps>(
  ({ style }, _ref) => {
    return (
      <View
        style={[
          {
            flex: 1,
            backgroundColor: "#E8F4F8",
            justifyContent: "center",
            alignItems: "center",
          },
          style,
        ]}
      >
        <Text
          style={{
            fontSize: 48,
            marginBottom: 16,
          }}
        >
          🐾
        </Text>
        <Text
          style={{
            color: "#1A9E8F",
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 8,
          }}
        >
          Pawzee
        </Text>
        <Text
          style={{
            color: "#666",
            fontSize: 14,
            textAlign: "center",
            paddingHorizontal: 32,
          }}
        >
          Download the app for the full experience
        </Text>
      </View>
    );
  },
);

MapViewWrapper.displayName = "MapViewWrapper";

export default MapViewWrapper;

export const Marker = () => null;
