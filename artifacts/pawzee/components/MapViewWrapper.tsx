import Constants from "expo-constants";
import React from "react";
import { Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const iosGoogleMapsEnabled = Boolean(
  Constants.expoConfig?.extra?.iosGoogleMapsEnabled,
);

const provider =
  Platform.OS === "android"
    ? PROVIDER_GOOGLE
    : iosGoogleMapsEnabled
      ? PROVIDER_GOOGLE
      : undefined;

const MapViewWrapper = React.forwardRef<MapView, MapViewWrapperProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <MapView
        ref={ref}
        style={style}
        {...(provider ? { provider } : {})}
        {...props}
      >
        {children}
      </MapView>
    );
  },
);

MapViewWrapper.displayName = "MapViewWrapper";

export default MapViewWrapper;
export { Marker };
