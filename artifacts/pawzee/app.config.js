const { expo: baseConfig } = require("./app.json");

const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

const iosBundleIdentifier =
  process.env.IOS_BUNDLE_IDENTIFIER || "com.pawzee.app";
const androidPackage =
  process.env.ANDROID_PACKAGE || "com.pawzee.app";

const extraPlugins = googleMapsApiKey
  ? [
      [
        "react-native-maps",
        {
          googleMapsApiKey,
        },
      ],
    ]
  : [];

module.exports = () => ({
  ...baseConfig,
  ios: {
    ...baseConfig.ios,
    bundleIdentifier: iosBundleIdentifier,
    config: {
      ...(baseConfig.ios?.config ?? {}),
      ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
    },
  },
  android: {
    ...baseConfig.android,
    package: androidPackage,
    config: {
      ...(baseConfig.android?.config ?? {}),
      ...(googleMapsApiKey
        ? {
            googleMaps: {
              ...((baseConfig.android?.config ?? {}).googleMaps ?? {}),
              apiKey: googleMapsApiKey,
            },
          }
        : {}),
    },
  },
  plugins: [
    ...(baseConfig.plugins ?? []),
    ...extraPlugins,
  ],
  extra: {
    ...(baseConfig.extra ?? {}),
    iosGoogleMapsEnabled: Boolean(googleMapsApiKey),
  },
});
