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

// ---------------------------------------------------------------------------
// Run cycle detection — determines the latest available model run
// ---------------------------------------------------------------------------
interface ModelConfig {
  id: string;
  name: string;
  color: string;
  runs: number[];       // available run hours (UTC)
  delayHours: number;   // hours after run time before data is typically available
}

const MODEL_DEFS: ModelConfig[] = [
  { id: "ecmwf_ifs025", name: "ECMWF",   color: "hsl(200, 80%, 55%)", runs: [0, 6, 12, 18], delayHours: 6 },
  { id: "gfs_seamless",  name: "GFS",     color: "hsl(140, 70%, 50%)", runs: [0, 6, 12, 18], delayHours: 5 },
  { id: "icon_seamless", name: "ICON-EU", color: "hsl(280, 70%, 60%)", runs: [0, 3, 6, 9, 12, 15, 18, 21], delayHours: 4 },
  { id: "gem_seamless",  name: "GEM",     color: "hsl(30, 90%, 55%)",  runs: [0, 12],        delayHours: 6 },
];

function getLatestRun(runs: number[], delayHours: number): number {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // Find the latest run whose data would be available by now
  const sorted = [...runs].sort((a, b) => b - a);
  for (const run of sorted) {
    if (utcHour >= run + delayHours) return run;
  }
  // If none available today, use previous day's last run
  return sorted[0];
}

function formatRun(run: number): string {
  return `${String(run).padStart(2, "0")}z`;
}

export interface ModelWithRun {
  id: string;
  name: string;
  displayName: string; // e.g. "GFS (12z)"
  color: string;
  run: number;
}

export function getActiveModels(): ModelWithRun[] {
  return MODEL_DEFS.map((def) => {
    const run = getLatestRun(def.runs, def.delayHours);
    return {
      id: def.id,
      name: def.name,
      displayName: `${def.name} (${formatRun(run)})`,
      color: def.color,
      run,
    };
  });
}

// Keep backward-compatible MODEL_CONFIGS shape for API calls
export const MODEL_CONFIGS = MODEL_DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  color: d.color,
}));

// ---------------------------------------------------------------------------
// Backend URL — set VITE_BACKEND_URL to point at your FastAPI instance.
// Falls back to direct Open-Meteo calls when the backend is unavailable.
// ---------------------------------------------------------------------------
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export interface FetchResult {
  models: ModelForecast[];
  startTime: string;
}

// ---------------------------------------------------------------------------
// Strategy 1: Fetch from FastAPI backend
// ---------------------------------------------------------------------------
async function fetchFromBackend(lat: number, lon: number): Promise<FetchResult> {
  const url = `${BACKEND_URL}/api/forecast?lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
  // Backend already normalizes — return as-is, no further processing needed
  return res.json();
}

// ---------------------------------------------------------------------------
// Strategy 2: Direct Open-Meteo (fallback)
// ---------------------------------------------------------------------------
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

async function fetchDirectFromOpenMeteo(lat: number, lon: number): Promise<FetchResult> {
  const activeModels = getActiveModels();
  const fetches = activeModels.map(async (cfg) => {
    try {
      const url = buildApiUrl(lat, lon, cfg.id);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return parseModelResponse(data, cfg.displayName, cfg.color);
    } catch (e) {
      console.warn(`Failed to fetch ${cfg.displayName}:`, e);
      return null;
    }
  });

  const all = await Promise.all(fetches);
  const valid = all.filter((r): r is ParseResult => r !== null && r.model.hours.length > 0);
  const results = valid.map((r) => r.model);
  const startTime = valid[0]?.startTimeISO ?? new Date().toISOString();

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

// ---------------------------------------------------------------------------
// Public API — tries backend first, falls back to direct calls
// ---------------------------------------------------------------------------
export async function fetchWeatherData(lat: number, lon: number): Promise<FetchResult> {
  if (BACKEND_URL) {
    try {
      return await fetchFromBackend(lat, lon);
    } catch (e) {
      console.warn("Backend unavailable, falling back to direct Open-Meteo:", e);
    }
  }
  return fetchDirectFromOpenMeteo(lat, lon);
}
