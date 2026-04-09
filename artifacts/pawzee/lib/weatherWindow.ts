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

function getHourStartUtcMs(naiveDateStr: string, utcOffsetSeconds: number): number {
  const local = new Date(naiveDateStr + "Z");
  const utcMs = local.getTime() - utcOffsetSeconds * 1000;
  const utcDate = new Date(utcMs);
  utcDate.setUTCMinutes(0, 0, 0);
  return utcDate.getTime();
}

export function buildRollingWeatherForecast(input: {
  current: CurrentWeatherWindowInput;
  hourly: HourlyWeatherWindowInput;
  windowHours?: number;
  utcOffsetSeconds?: number;
}): WeatherHourForecast[] {
  const {
    current,
    hourly,
    windowHours = WEATHER_FORECAST_WINDOW_HOURS,
    utcOffsetSeconds = 0,
  } = input;

  const currentHourUtcMs = getHourStartUtcMs(current.time, utcOffsetSeconds);

  const currentHourIndex = hourly.time.findIndex(
    (time) => getHourStartUtcMs(time, utcOffsetSeconds) === currentHourUtcMs,
  );

  const nextHourIndex = hourly.time.findIndex(
    (time) => getHourStartUtcMs(time, utcOffsetSeconds) > currentHourUtcMs,
  );
  const nextHourStartIndex =
    nextHourIndex === -1 ? hourly.time.length : nextHourIndex;

  const rawPrecip =
    currentHourIndex >= 0
      ? (hourly.precipitationProbability?.[currentHourIndex] ?? null)
      : null;

  console.log(
    `[weather] currentHourIndex=${currentHourIndex}`,
    `utcOffsetSec=${utcOffsetSeconds}`,
    `rawPrecip=${rawPrecip}%`,
  );

  const currentHour: WeatherHourForecast = {
    time: current.time,
    temperatureC: Math.round(current.temperatureC),
    weatherCode: current.weatherCode,
    precipitationProbability: rawPrecip,
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
      const precip = hourly.precipitationProbability?.[dataIndex] ?? null;
      return {
        time,
        temperatureC: Math.round(hourly.temperatureC[dataIndex]),
        weatherCode: hourly.weatherCode[dataIndex],
        precipitationProbability: precip,
        isCurrentHour: false,
        isDay: true,
      };
    });

  const result = [currentHour, ...futureHours].slice(0, windowHours);

  console.log(
    `[weather] current hour precip=${rawPrecip}%,`,
    `displayed=${rawPrecip ?? 0}%`,
    `(source: Open-Meteo hourly.precipitation_probability[${currentHourIndex}])`,
  );

  return result;
}

export function getMillisecondsUntilNextHour(
  referenceDate = new Date(),
): number {
  const nextHour = new Date(referenceDate);
  nextHour.setHours(referenceDate.getHours() + 1, 0, 0, 0);
  return nextHour.getTime() - referenceDate.getTime();
}
