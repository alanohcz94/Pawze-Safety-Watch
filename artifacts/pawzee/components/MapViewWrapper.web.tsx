import React from "react";
import { View } from "react-native";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };
  [key: string]: any;
}

const MapViewWrapper = React.forwardRef<any, MapViewWrapperProps>(
  ({ style, initialRegion }, _ref) => {
    const lat = initialRegion?.latitude ?? 1.3521;
    const lng = initialRegion?.longitude ?? 103.8198;
    const zoom = 14;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #E8F4F8; }
    .leaflet-control-attribution { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var userIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#1A9E8F;border:2px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(26,158,143,0.25);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: ''
    });

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(function(pos) {
        var latlng = [pos.coords.latitude, pos.coords.longitude];
        if (!window._userMarker) {
          window._userMarker = L.marker(latlng, { icon: userIcon }).addTo(map);
          map.setView(latlng, ${zoom});
        } else {
          window._userMarker.setLatLng(latlng);
        }
      }, null, { enableHighAccuracy: true, maximumAge: 5000 });
    }
  </script>
</body>
</html>`;

    return (
      <View style={[{ flex: 1, overflow: "hidden" }, style]}>
        <iframe
          srcDoc={html}
          style={
            {
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            } as React.CSSProperties
          }
          title="Pawzee Map"
          sandbox="allow-scripts allow-same-origin"
        />
      </View>
    );
  },
);

MapViewWrapper.displayName = "MapViewWrapper";

export default MapViewWrapper;

export const Marker = () => null;
