import { MaterialCommunityIcons } from "@expo/vector-icons";

export interface WeatherHourForecast {
  time: string;
  temperatureC: number;
  weatherCode: number;
  precipitationProbability: number | null;
}

export interface AreaWeatherReport {
  currentTime: string;
  currentTempC: number;
  currentWeatherCode: number;
  currentWindSpeedKmh: number;
  currentWindDirectionDeg: number;
  currentIsDay: boolean;
  forecast: WeatherHourForecast[];
}

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    is_day: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability?: Array<number | null>;
  };
}

type WeatherVisual = {
  label: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
};

const WEATHER_VISUALS: Record<number, WeatherVisual> = {
  0: { label: "Clear sky", iconName: "weather-sunny" },
  1: { label: "Mainly clear", iconName: "weather-partly-cloudy" },
  2: { label: "Partly cloudy", iconName: "weather-partly-cloudy" },
  3: { label: "Overcast", iconName: "weather-cloudy" },
  45: { label: "Foggy", iconName: "weather-fog" },
  48: { label: "Rime fog", iconName: "weather-fog" },
  51: { label: "Light drizzle", iconName: "weather-rainy" },
  53: { label: "Drizzle", iconName: "weather-rainy" },
  55: { label: "Dense drizzle", iconName: "weather-pouring" },
  56: { label: "Freezing drizzle", iconName: "weather-snowy-rainy" },
  57: { label: "Freezing drizzle", iconName: "weather-snowy-rainy" },
  61: { label: "Light rain", iconName: "weather-rainy" },
  63: { label: "Rain", iconName: "weather-rainy" },
  65: { label: "Heavy rain", iconName: "weather-pouring" },
  66: { label: "Freezing rain", iconName: "weather-snowy-rainy" },
  67: { label: "Freezing rain", iconName: "weather-snowy-rainy" },
  71: { label: "Light snow", iconName: "weather-snowy" },
  73: { label: "Snow", iconName: "weather-snowy" },
  75: { label: "Heavy snow", iconName: "weather-snowy-heavy" },
  77: { label: "Snow grains", iconName: "weather-snowy" },
  80: { label: "Rain showers", iconName: "weather-partly-rainy" },
  81: { label: "Rain showers", iconName: "weather-rainy" },
  82: { label: "Heavy showers", iconName: "weather-pouring" },
  85: { label: "Snow showers", iconName: "weather-snowy" },
  86: { label: "Heavy snow showers", iconName: "weather-snowy-heavy" },
  95: { label: "Thunderstorm", iconName: "weather-lightning-rainy" },
  96: { label: "Thunderstorm hail", iconName: "weather-lightning" },
  99: { label: "Thunderstorm hail", iconName: "weather-lightning" },
};

export function getWeatherVisual(
  weatherCode: number,
  isDay = true,
): WeatherVisual {
  if (!isDay && (weatherCode === 0 || weatherCode === 1)) {
    return { label: "Clear night", iconName: "weather-night" };
  }

  if (!isDay && weatherCode === 2) {
    return {
      label: "Partly cloudy night",
      iconName: "weather-night-partly-cloudy",
    };
  }

  return WEATHER_VISUALS[weatherCode] ?? {
    label: "Weather update",
    iconName: "weather-partly-cloudy",
  };
}

export function getWindDirectionLabel(degrees: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % directions.length;
  return directions[index];
}

export function formatForecastHour(time: string): string {
  const date = new Date(time);
  return date
    .toLocaleTimeString("en-US", { hour: "numeric" })
    .replace(" ", "");
}

export async function fetchAreaWeather(
  lat: number,
  lng: number,
): Promise<AreaWeatherReport> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(6),
    longitude: lng.toFixed(6),
    timezone: "auto",
    forecast_days: "1",
    wind_speed_unit: "kmh",
    current:
      "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) {
    throw new Error("Failed to fetch weather");
  }

  const data = (await res.json()) as OpenMeteoResponse;
  if (!data.current || !data.hourly) {
    throw new Error("Weather response missing required fields");
  }

  const now = new Date(data.current.time).getTime();
  const startIndex = Math.max(
    0,
    data.hourly.time.findIndex((time) => new Date(time).getTime() >= now),
  );

  const forecast = data.hourly.time
    .slice(startIndex, startIndex + 8)
    .map((time, index) => ({
      time,
      temperatureC: Math.round(data.hourly!.temperature_2m[startIndex + index]),
      weatherCode: data.hourly!.weather_code[startIndex + index],
      precipitationProbability:
        data.hourly!.precipitation_probability?.[startIndex + index] ?? null,
    }));

  return {
    currentTime: data.current.time,
    currentTempC: Math.round(data.current.temperature_2m),
    currentWeatherCode: data.current.weather_code,
    currentWindSpeedKmh: Math.round(data.current.wind_speed_10m),
    currentWindDirectionDeg: Math.round(data.current.wind_direction_10m),
    currentIsDay: data.current.is_day === 1,
    forecast,
  };
}
