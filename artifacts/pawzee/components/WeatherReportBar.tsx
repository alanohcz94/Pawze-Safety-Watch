import React from "react";
import { ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import {
  type AreaWeatherReport,
  formatForecastHour,
  getWeatherVisual,
  getWindDirectionLabel,
} from "@/lib/weather";
import { styles } from "./componentStyleSheet/StyleSheetWeatherReportBar";

interface WeatherReportBarProps {
  weather: AreaWeatherReport | null;
  loading?: boolean;
}

export function WeatherReportBar({
  weather,
  loading = false,
}: WeatherReportBarProps) {
  const currentVisual = weather
    ? getWeatherVisual(weather.currentWeatherCode, weather.currentIsDay)
    : null;
  const currentWindDirection = weather
    ? getWindDirectionLabel(weather.currentWindDirectionDeg)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.currentPill}>
            <Text style={styles.currentTemp}>
              {loading ? "--" : weather ? `${weather.currentTempC}°` : "--"}
            </Text>
            <Text style={styles.currentLabel}>Now</Text>
          </View>

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>
              {loading
                ? "Updating weather..."
                : currentVisual?.label ?? "Weather unavailable"}
            </Text>
            <Text style={styles.subtitle}>
              {loading
                ? "Pulling the latest forecast for this area."
                : weather
                  ? `Wind from ${currentWindDirection} at ${weather.currentWindSpeedKmh} km/h`
                  : "Unable to load the weather report right now."}
            </Text>
          </View>

          {currentVisual && (
            <View style={styles.currentIconWrap}>
              <MaterialCommunityIcons
                name={currentVisual.iconName}
                size={24}
                color={Colors.primary}
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.forecastRow}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <View key={`weather-loading-${index}`} style={styles.forecastCard}>
              <Text style={styles.forecastTime}>--</Text>
              <View style={styles.loadingIcon} />
              <Text style={styles.forecastTemp}>--</Text>
            </View>
          ))
        ) : weather?.forecast.length ? (
          weather.forecast.map((hour) => {
            const visual = getWeatherVisual(hour.weatherCode, true);

            return (
              <View key={hour.time} style={styles.forecastCard}>
                <Text style={styles.forecastTime}>
                  {formatForecastHour(hour.time)}
                </Text>

                <MaterialCommunityIcons
                  name={visual.iconName}
                  size={22}
                  color={
                    hour.precipitationProbability &&
                    hour.precipitationProbability > 0
                      ? Colors.primary
                      : Colors.warning
                  }
                />

                {hour.precipitationProbability != null &&
                hour.precipitationProbability > 0 ? (
                  <Text style={styles.precipitationText}>
                    {hour.precipitationProbability}%
                  </Text>
                ) : (
                  <Text style={styles.placeholderText}> </Text>
                )}

                <Text style={styles.forecastTemp}>{hour.temperatureC}°</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyForecast}>
            <Text style={styles.emptyForecastText}>
              Forecast data is not available for this area yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
