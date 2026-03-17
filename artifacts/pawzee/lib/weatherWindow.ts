export const WEATHER_FORECAST_WINDOW_HOURS = 8;

export interface WeatherHourForecast {
  time: string;
  temperatureC: number;
  weatherCode: number;
  precipitationProbability: number | null;
  isCurrentHour: boolean;
  isDay: boolean;
}

interface CurrentWeatherWindowInput {
  time: string;
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
}

interface HourlyWeatherWindowInput {
  time: string[];
  temperatureC: number[];
  weatherCode: number[];
  precipitationProbability?: Array<number | null>;
}

function getHourStartMs(value: string | Date): number {
  const date = new Date(value);
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

export function buildRollingWeatherForecast(input: {
  current: CurrentWeatherWindowInput;
  hourly: HourlyWeatherWindowInput;
  windowHours?: number;
}): WeatherHourForecast[] {
  const { current, hourly, windowHours = WEATHER_FORECAST_WINDOW_HOURS } = input;
  const currentHourMs = getHourStartMs(current.time);
  const currentHourIndex = hourly.time.findIndex(
    (time) => getHourStartMs(time) === currentHourMs,
  );
  const nextHourIndex = hourly.time.findIndex(
    (time) => getHourStartMs(time) > currentHourMs,
  );
  const nextHourStartIndex =
    nextHourIndex === -1 ? hourly.time.length : nextHourIndex;

  const currentHour: WeatherHourForecast = {
    time: current.time,
    temperatureC: Math.round(current.temperatureC),
    weatherCode: current.weatherCode,
    precipitationProbability:
      currentHourIndex >= 0
        ? hourly.precipitationProbability?.[currentHourIndex] ?? null
        : null,
    isCurrentHour: true,
    isDay: current.isDay,
  };

  const futureHours = hourly.time
    .slice(
      nextHourStartIndex,
      nextHourStartIndex + Math.max(windowHours - 1, 0),
    )
    .map((time, index) => {
      const dataIndex = nextHourStartIndex + index;

      return {
        time,
        temperatureC: Math.round(hourly.temperatureC[dataIndex]),
        weatherCode: hourly.weatherCode[dataIndex],
        precipitationProbability:
          hourly.precipitationProbability?.[dataIndex] ?? null,
        isCurrentHour: false,
        isDay: true,
      };
    });

  return [currentHour, ...futureHours].slice(0, windowHours);
}

export function getMillisecondsUntilNextHour(
  referenceDate = new Date(),
): number {
  const nextHour = new Date(referenceDate);
  nextHour.setHours(referenceDate.getHours() + 1, 0, 0, 0);
  return nextHour.getTime() - referenceDate.getTime();
}
