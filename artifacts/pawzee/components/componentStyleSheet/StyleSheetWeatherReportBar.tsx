import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#20264E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    gap: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  currentPill: {
    width: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  currentTemp: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  currentLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.68)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.76)",
  },
  currentIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
  },
  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  forecastRow: {
    gap: 12,
    paddingRight: 8,
  },
  forecastCard: {
    width: 86,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  forecastTime: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  precipitationText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#58D4FF",
    marginTop: 8,
  },
  placeholderText: {
    height: 18,
    marginTop: 8,
    fontSize: 12,
    color: "transparent",
  },
  forecastTemp: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginTop: 8,
  },
  loadingIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  emptyForecast: {
    paddingVertical: 12,
    paddingRight: 16,
  },
  emptyForecastText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.74)",
  },
});

export { styles };
