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

export const defaultLocation: Location = {
  name: "Kaisariani, Athens, Attica",
  lat: 37.9637,
  lon: 23.7584,
  country: "GR",
};

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

export const MODEL_CONFIGS = [
  { id: "ecmwf_ifs025", name: "ECMWF", color: "hsl(200, 80%, 55%)" },
  { id: "gfs_seamless", name: "GFS", color: "hsl(140, 70%, 50%)" },
  { id: "icon_seamless", name: "ICON", color: "hsl(30, 90%, 55%)" },
  { id: "icon_eu", name: "ICON-EU", color: "hsl(280, 70%, 60%)" },
];

const HOURLY_PARAMS = [
  "temperature_2m",
  "precipitation",
  "wind_speed_10m",
  "wind_gusts_10m",
  "pressure_msl",
  "relative_humidity_2m",
  "dew_point_2m",
  "cape",
];

const MAX_HOURS = 120;

function buildApiUrl(lat: number, lon: number, modelId: string): string {
  const params = HOURLY_PARAMS.join(",");
  // Request 6 days to cover 120h+ then trim
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&models=${modelId}&forecast_days=6&timezone=auto`;
}

interface ParseResult {
  model: ModelForecast;
  startTimeISO: string;
}

function parseModelResponse(data: any, modelName: string, color: string): ParseResult | null {
  const hourly = data.hourly;
  if (!hourly || !hourly.time || hourly.time.length === 0) return null;

  const startTimeISO = hourly.time[0] as string;
  const startTime = new Date(startTimeISO).getTime();

  const rawHours: number[] = [];
  const rawTemp: number[] = [];
  const rawPrecip: number[] = [];
  const rawWind: number[] = [];
  const rawGusts: number[] = [];
  const rawPressure: number[] = [];
  const rawHumidity: number[] = [];
  const rawDew: number[] = [];
  const rawCape: number[] = [];

  for (let i = 0; i < hourly.time.length; i++) {
    const h = Math.round((new Date(hourly.time[i]).getTime() - startTime) / 3600000);
    if (h > MAX_HOURS) break;
    if (hourly.temperature_2m[i] === null || hourly.temperature_2m[i] === undefined) break;

    rawHours.push(h);
    rawTemp.push(hourly.temperature_2m[i] ?? 0);
    rawPrecip.push(hourly.precipitation?.[i] ?? 0);
    rawWind.push(hourly.wind_speed_10m?.[i] ?? 0);
    rawGusts.push(hourly.wind_gusts_10m?.[i] ?? 0);
    rawPressure.push(hourly.pressure_msl?.[i] ?? 0);
    rawHumidity.push(hourly.relative_humidity_2m?.[i] ?? 0);
    rawDew.push(hourly.dew_point_2m?.[i] ?? 0);
    rawCape.push(hourly.cape?.[i] ?? 0);
  }

  if (rawHours.length === 0) return null;

  return {
    startTimeISO,
    model: {
      model: modelName,
      color,
      hours: rawHours,
      temperature: rawTemp,
      precipitation: rawPrecip,
      windSpeed: rawWind,
      windGusts: rawGusts,
      pressure: rawPressure,
      humidity: rawHumidity,
      dewPoint: rawDew,
      cape: rawCape,
    },
  };
}

export interface FetchResult {
  models: ModelForecast[];
  startTime: string;
}

export async function fetchWeatherData(lat: number, lon: number): Promise<FetchResult> {
  const fetches = MODEL_CONFIGS.map(async (cfg) => {
    try {
      const url = buildApiUrl(lat, lon, cfg.id);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return parseModelResponse(data, cfg.name, cfg.color);
    } catch (e) {
      console.warn(`Failed to fetch ${cfg.name}:`, e);
      return null;
    }
  });

  const all = await Promise.all(fetches);
  const valid = all.filter((r): r is ParseResult => r !== null && r.model.hours.length > 0);
  const results = valid.map((r) => r.model);
  const startTime = valid[0]?.startTimeISO ?? new Date().toISOString();

  // Normalize to common hours
  if (results.length > 1) {
    const minLen = Math.min(...results.map((r) => r.hours.length));
    const fields: (keyof ModelForecast)[] = ["hours", "temperature", "precipitation", "windSpeed", "windGusts", "pressure", "humidity", "dewPoint", "cape"];
    for (const r of results) {
      for (const f of fields) {
        (r as any)[f] = (r as any)[f].slice(0, minLen);
      }
    }
  }

  return { models: results, startTime };
}
