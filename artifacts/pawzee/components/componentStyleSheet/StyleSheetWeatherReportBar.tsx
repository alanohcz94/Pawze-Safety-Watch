import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    width: 58,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
  },
  currentTemp: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  currentLabel: {
    fontSize: 10,
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
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  currentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 72,
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
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 10,
  },
  currentForecastTime: {
    color: "#175A9F",
  },
  precipitationText: {
    fontSize: 11,
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
    fontSize: 11,
    color: "transparent",
  },
  currentPlaceholderText: {
    color: "#5B9ED4",
  },
  forecastTemp: {
    fontSize: 16,
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
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});

export { styles };
