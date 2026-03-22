const { expo: baseConfig } = require("./app.json");

const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

const iosBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER;
const androidPackage = process.env.ANDROID_PACKAGE;

module.exports = () => ({
  ...baseConfig,
  ios: {
    ...baseConfig.ios,
    ...(iosBundleIdentifier ? { bundleIdentifier: iosBundleIdentifier } : {}),
    config: {
      ...(baseConfig.ios?.config ?? {}),
      ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
    },
  },
  android: {
    ...baseConfig.android,
    ...(androidPackage ? { package: androidPackage } : {}),
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
  extra: {
    ...(baseConfig.extra ?? {}),
    iosGoogleMapsEnabled: Boolean(googleMapsApiKey),
  },
});
