const { expo: baseConfig } = require("./app.json");

const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

const iosBundleIdentifier =
  process.env.IOS_BUNDLE_IDENTIFIER || "com.pawzee.app";
const androidPackage =
  process.env.ANDROID_PACKAGE || "com.pawzee.app";

const isReplit = Boolean(process.env.REPL_ID);

const plugins = (baseConfig.plugins ?? []).map((plugin) => {
  const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
  if (pluginName === "expo-router") {
    return isReplit
      ? ["expo-router", { origin: "https://replit.com/" }]
      : "expo-router";
  }
  return plugin;
});

module.exports = () => ({
  ...baseConfig,
  plugins,
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
  extra: {
    ...(baseConfig.extra ?? {}),
    iosGoogleMapsEnabled: Boolean(googleMapsApiKey),
  },
});
