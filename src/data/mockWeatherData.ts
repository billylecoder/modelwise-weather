export interface ModelForecast {
  model: string;
  color: string;
  hours: number[];
  temperature: number[];
  precipitation: number[];
  windSpeed: number[];
  windGusts: number[];
  pressure: number[];
  humidity: number[];
  dewPoint: number[];
  cape: number[];
}

export interface Location {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

const hours = Array.from({ length: 49 }, (_, i) => i * 3); // 0-144h in 3h steps

function generateTemp(base: number, variance: number): number[] {
  return hours.map((h) => {
    const diurnal = Math.sin(((h % 24) - 6) * (Math.PI / 12)) * 5;
    const trend = h > 72 ? -2 : 0;
    return +(base + diurnal + trend + (Math.random() - 0.5) * variance).toFixed(1);
  });
}

function generatePrecip(chance: number): number[] {
  return hours.map((h) => {
    const storm = h > 24 && h < 72 ? 0.6 : 0.1;
    return +(Math.random() < (chance + storm) ? Math.random() * 8 : 0).toFixed(1);
  });
}

function generateWind(base: number, variance: number): number[] {
  return hours.map(() => +(base + (Math.random() - 0.3) * variance).toFixed(1));
}

function generatePressure(base: number): number[] {
  return hours.map((h) => +(base - h * 0.02 + (Math.random() - 0.5) * 2).toFixed(1));
}

function generateHumidity(base: number): number[] {
  return hours.map((h) => {
    const val = base + Math.sin(h * 0.1) * 15 + (Math.random() - 0.5) * 10;
    return +Math.max(20, Math.min(100, val)).toFixed(0);
  });
}

export const models: ModelForecast[] = [
  {
    model: "ECMWF",
    color: "hsl(200, 80%, 55%)",
    hours,
    temperature: generateTemp(22, 1.5),
    precipitation: generatePrecip(0.2),
    windSpeed: generateWind(12, 8),
    windGusts: generateWind(22, 12),
    pressure: generatePressure(1013),
    humidity: generateHumidity(65),
    dewPoint: generateTemp(14, 1),
    cape: hours.map(() => +(Math.random() * 2000).toFixed(0)),
  },
  {
    model: "GFS",
    color: "hsl(140, 70%, 50%)",
    hours,
    temperature: generateTemp(23, 2),
    precipitation: generatePrecip(0.3),
    windSpeed: generateWind(14, 10),
    windGusts: generateWind(25, 14),
    pressure: generatePressure(1012),
    humidity: generateHumidity(60),
    dewPoint: generateTemp(13, 1.5),
    cape: hours.map(() => +(Math.random() * 2500).toFixed(0)),
  },
  {
    model: "ICON",
    color: "hsl(30, 90%, 55%)",
    hours,
    temperature: generateTemp(21.5, 1.8),
    precipitation: generatePrecip(0.25),
    windSpeed: generateWind(11, 7),
    windGusts: generateWind(20, 11),
    pressure: generatePressure(1014),
    humidity: generateHumidity(68),
    dewPoint: generateTemp(14.5, 1.2),
    cape: hours.map(() => +(Math.random() * 1800).toFixed(0)),
  },
  {
    model: "NAM",
    color: "hsl(340, 75%, 55%)",
    hours,
    temperature: generateTemp(22.5, 2.5),
    precipitation: generatePrecip(0.35),
    windSpeed: generateWind(13, 9),
    windGusts: generateWind(23, 13),
    pressure: generatePressure(1011),
    humidity: generateHumidity(62),
    dewPoint: generateTemp(13.5, 1.8),
    cape: hours.map(() => +(Math.random() * 2200).toFixed(0)),
  },
];

export const defaultLocation: Location = {
  name: "New York City",
  lat: 40.7128,
  lon: -74.006,
  country: "US",
};

export const sampleLocations: Location[] = [
  { name: "New York City", lat: 40.7128, lon: -74.006, country: "US" },
  { name: "London", lat: 51.5074, lon: -0.1278, country: "GB" },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, country: "JP" },
  { name: "Berlin", lat: 52.52, lon: 13.405, country: "DE" },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, country: "AU" },
  { name: "São Paulo", lat: -23.5505, lon: -46.6333, country: "BR" },
  { name: "Dubai", lat: 25.2048, lon: 55.2708, country: "AE" },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, country: "IN" },
];

export type WeatherParam = "temperature" | "precipitation" | "windSpeed" | "windGusts" | "pressure" | "humidity" | "dewPoint" | "cape";

export const parameterConfig: Record<WeatherParam, { label: string; unit: string; icon: string }> = {
  temperature: { label: "Temperature", unit: "°C", icon: "Thermometer" },
  precipitation: { label: "Precipitation", unit: "mm", icon: "CloudRain" },
  windSpeed: { label: "Wind Speed", unit: "km/h", icon: "Wind" },
  windGusts: { label: "Wind Gusts", unit: "km/h", icon: "Wind" },
  pressure: { label: "Pressure", unit: "hPa", icon: "Gauge" },
  humidity: { label: "Humidity", unit: "%", icon: "Droplets" },
  dewPoint: { label: "Dew Point", unit: "°C", icon: "Thermometer" },
  cape: { label: "CAPE", unit: "J/kg", icon: "Zap" },
};
