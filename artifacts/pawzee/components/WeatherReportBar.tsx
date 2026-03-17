import React from "react";
import { ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import {
  type AreaWeatherReport,
  formatForecastHour,
  getWeatherVisual,
} from "@/lib/weather";
import { styles } from "./componentStyleSheet/StyleSheetWeatherReportBar";

interface WeatherReportBarProps {
  weather: AreaWeatherReport | null;
  loading?: boolean;
}

const CURRENT_HOUR_ICON_COLOR = "#1E88E5";

export function WeatherReportBar({
  weather,
  loading = false,
}: WeatherReportBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.forecastRow}
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <View key={`weather-loading-${index}`} style={styles.forecastCard}>
              <Text style={styles.forecastTime}>--</Text>
              <View style={styles.loadingIcon} />
              <Text style={styles.forecastTemp}>--</Text>
            </View>
          ))
        ) : weather?.forecast.length ? (
          weather.forecast.map((hour) => {
            const isCurrentHour = hour.isCurrentHour;
            const visual = getWeatherVisual(hour.weatherCode, hour.isDay);

            return (
              <View
                key={hour.time}
                style={[
                  styles.forecastCard,
                  isCurrentHour && styles.currentForecastCard,
                ]}
              >
                <Text
                  style={[
                    styles.forecastTime,
                    isCurrentHour && styles.currentForecastTime,
                  ]}
                >
                  {formatForecastHour(hour.time)}
                </Text>

                <MaterialCommunityIcons
                  name={visual.iconName}
                  size={22}
                  color={
                    isCurrentHour
                      ? CURRENT_HOUR_ICON_COLOR
                      : hour.precipitationProbability &&
                          hour.precipitationProbability > 0
                        ? Colors.primary
                        : Colors.warning
                  }
                />

                {hour.precipitationProbability != null &&
                hour.precipitationProbability > 0 ? (
                  <Text
                    style={[
                      styles.precipitationText,
                      isCurrentHour && styles.currentPrecipitationText,
                    ]}
                  >
                    {hour.precipitationProbability}%
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.placeholderText,
                      isCurrentHour && styles.currentPlaceholderText,
                    ]}
                  >
                    0%
                  </Text>
                )}

                <Text
                  style={[
                    styles.forecastTemp,
                    isCurrentHour && styles.currentForecastTemp,
                  ]}
                >
                  {hour.temperatureC}
                  {"\u00B0"}
                </Text>
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
