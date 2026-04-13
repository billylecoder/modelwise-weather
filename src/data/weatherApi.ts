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

function buildApiUrl(lat: number, lon: number, modelId: string): string {
  const params = HOURLY_PARAMS.join(",");
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&models=${modelId}&forecast_days=7&timezone=auto`;
}

function parseModelResponse(data: any, modelName: string, color: string): ModelForecast | null {
  const hourly = data.hourly;
  if (!hourly || !hourly.time) return null;

  const startTime = new Date(hourly.time[0]).getTime();
  const hours = hourly.time.map((t: string) => {
    return Math.round((new Date(t).getTime() - startTime) / 3600000);
  });

  return {
    model: modelName,
    color,
    hours,
    temperature: (hourly.temperature_2m ?? []).map((v: number | null) => v ?? 0),
    precipitation: (hourly.precipitation ?? []).map((v: number | null) => v ?? 0),
    windSpeed: (hourly.wind_speed_10m ?? []).map((v: number | null) => v ?? 0),
    windGusts: (hourly.wind_gusts_10m ?? []).map((v: number | null) => v ?? 0),
    pressure: (hourly.pressure_msl ?? []).map((v: number | null) => v ?? 0),
    humidity: (hourly.relative_humidity_2m ?? []).map((v: number | null) => v ?? 0),
    dewPoint: (hourly.dew_point_2m ?? []).map((v: number | null) => v ?? 0),
    cape: (hourly.cape ?? []).map((v: number | null) => v ?? 0),
  };
}

export async function fetchWeatherData(lat: number, lon: number): Promise<ModelForecast[]> {
  const results: ModelForecast[] = [];

  const fetches = MODEL_CONFIGS.map(async (cfg) => {
    try {
      const url = buildApiUrl(lat, lon, cfg.id);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = parseModelResponse(data, cfg.name, cfg.color);
      if (parsed) return parsed;
    } catch (e) {
      console.warn(`Failed to fetch ${cfg.name}:`, e);
    }
    return null;
  });

  const all = await Promise.all(fetches);
  for (const m of all) {
    if (m) results.push(m);
  }

  // Normalize to same length (shortest common hours array)
  if (results.length > 1) {
    const minLen = Math.min(...results.map((r) => r.hours.length));
    for (const r of results) {
      r.hours = r.hours.slice(0, minLen);
      r.temperature = r.temperature.slice(0, minLen);
      r.precipitation = r.precipitation.slice(0, minLen);
      r.windSpeed = r.windSpeed.slice(0, minLen);
      r.windGusts = r.windGusts.slice(0, minLen);
      r.pressure = r.pressure.slice(0, minLen);
      r.humidity = r.humidity.slice(0, minLen);
      r.dewPoint = r.dewPoint.slice(0, minLen);
      r.cape = r.cape.slice(0, minLen);
    }
  }

  return results;
}
