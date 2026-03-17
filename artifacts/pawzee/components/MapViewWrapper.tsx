import React from "react";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const MapViewWrapper = React.forwardRef<MapView, MapViewWrapperProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <MapView ref={ref} style={style} provider={PROVIDER_GOOGLE} {...props}>
        {children}
      </MapView>
    );
  },
);

MapViewWrapper.displayName = "MapViewWrapper";

export default MapViewWrapper;
export { Marker };
