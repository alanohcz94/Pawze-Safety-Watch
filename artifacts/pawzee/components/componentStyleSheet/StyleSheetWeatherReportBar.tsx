import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import type { ResponsiveUtils } from "@/lib/responsive";

export function createStyles(r: ResponsiveUtils) {
  return StyleSheet.create({
    container: {
      borderRadius: 20,
      paddingVertical: r.rs(12),
      paddingHorizontal: r.rs(12),
      backgroundColor: Colors.mapOverlay,
      borderWidth: 1,
      borderColor: Colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    header: {
      gap: 8,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    currentPill: {
      width: r.rs(58),
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 16,
      alignItems: "center",
      backgroundColor: Colors.primaryLight,
    },
    currentTemp: {
      fontSize: r.rf(21),
      fontFamily: "Inter_700Bold",
      color: Colors.text,
    },
    currentLabel: {
      fontSize: r.rf(10),
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: r.rf(14),
      lineHeight: r.rf(18),
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
    },
    subtitle: {
      marginTop: 2,
      fontSize: r.rf(12),
      lineHeight: r.rf(16),
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
    },
    currentIconWrap: {
      width: r.rs(40),
      height: r.rs(40),
      borderRadius: r.rs(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.surfaceSecondary,
    },
    divider: {
      height: 1,
      marginTop: 12,
      marginBottom: 10,
      backgroundColor: Colors.border,
    },
    forecastRow: {
      gap: 8,
      paddingRight: 8,
    },
    forecastCard: {
      width: r.rs(72),
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      backgroundColor: Colors.surface,
    },
    currentForecastCard: {
      backgroundColor: "#DDF2FF",
      borderWidth: 1,
      borderColor: "#9FD5FF",
    },
    forecastTime: {
      fontSize: r.rf(12),
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
      marginBottom: 10,
    },
    currentForecastTime: {
      color: "#175A9F",
    },
    precipitationText: {
      fontSize: r.rf(11),
      fontFamily: "Inter_700Bold",
      color: Colors.primary,
      marginTop: 6,
    },
    currentPrecipitationText: {
      color: "#1E88E5",
    },
    placeholderText: {
      height: 16,
      marginTop: 6,
      fontSize: r.rf(11),
      color: "transparent",
    },
    currentPlaceholderText: {
      color: "#5B9ED4",
    },
    forecastTemp: {
      fontSize: r.rf(16),
      fontFamily: "Inter_700Bold",
      color: Colors.text,
      marginTop: 6,
    },
    currentForecastTemp: {
      color: "#175A9F",
    },
    loadingIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: Colors.surfaceSecondary,
    },
    emptyForecast: {
      paddingVertical: 10,
      paddingRight: 16,
    },
    emptyForecastText: {
      fontSize: r.rf(12),
      lineHeight: r.rf(16),
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
    },
  });
}
