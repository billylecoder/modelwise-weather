export interface ModelForecast {
  model: string;
  color: string;
  hours: number[];
  temperature: number[];
  precipitation: number[];
  precipitationTotal: number[];
  windSpeed: number[];
  windGusts: number[];
  pressure: number[];
  humidity: number[];
  dewPoint: number[];
  cape: number[];
  temp850hPa: number[];
  temp500hPa: number[];
  apparentTemperature: number[];
  cloudCover: number[];
  snowfall: number[];
  snowDepth: number[];
  dust: number[];
}

export interface AirInfo {
  hours: number[];      // forecast hour offsets aligned to startTime
  uvIndex: (number | null)[];
  aqi: (number | null)[];
  dust: (number | null)[];
}

export interface Location {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

export const defaultLocation: Location = {
  name: "Athens, Attica, Greece",
  lat: 37.9838,
  lon: 23.7275,
  country: "GR",
};

export type WeatherParam = (
  "temperature" |
  "precipitation" |
  "precipitationTotal" |
  "windSpeed" |
  "windGusts" |
  "pressure" |
  "humidity" |
  "dewPoint" |
  "cape" |
  "temp850hPa" | 
  "temp500hPa" |
  "apparentTemperature" |
  "cloudCover" |
  "snowfall" |
  "snowDepth" |
  "dust"
);

export const parameterConfig: Record<WeatherParam, { label: string; unit: string; icon: string }> = {
  temperature: { label: "Temperature", unit: "°C", icon: "Thermometer" },
  apparentTemperature: { label: "Feels Like", unit: "°C", icon: "Thermometer" },
  precipitation: { label: "Precipitation", unit: "mm", icon: "CloudRain" },
  precipitationTotal: { label: "Rain Total", unit: "mm", icon: "CloudRain" },
  windSpeed: { label: "Wind Speed", unit: "km/h", icon: "Wind" },
  windGusts: { label: "Wind Gusts", unit: "km/h", icon: "Wind" },
  pressure: { label: "Pressure", unit: "hPa", icon: "Gauge" },
  humidity: { label: "Humidity", unit: "%", icon: "Droplets" },
  dewPoint: { label: "Dew Point", unit: "°C", icon: "Thermometer" },
  cloudCover: { label: "Cloud Cover", unit: "%", icon: "Cloud" },
  cape: { label: "CAPE", unit: "J/kg", icon: "Zap" },
  temp850hPa: { label: "Temp 850hPa", unit: "°C", icon: "Thermometer" },
  temp500hPa: { label: "Temp 500hPa", unit: "°C", icon: "Thermometer" },
  snowfall: { label: "New Snow", unit: "cm", icon: "Snowflake" },
  snowDepth: { label: "Snow Depth", unit: "cm", icon: "Snowflake" },
  dust: { label: "Saharan Dust", unit: "µg/m³", icon: "Wind" },
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
  airInfo?: AirInfo;
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
  "temperature_850hPa",
  "temperature_500hPa",
  "apparent_temperature",
  "cloud_cover",
  "snowfall",
  "snow_depth",
];

const MAX_HOURS = 360;

function buildApiUrl(lat: number, lon: number, modelId: string): string {
  const params = HOURLY_PARAMS.join(",");
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&models=${modelId}&forecast_days=16&timezone=auto`;
}

interface ParseResult {
  model: ModelForecast;
  startTimeISO: string;
}

/**
 * De-interpolate precipitation. When Open-Meteo returns 3h/6h precipitation
 * for long-range data, it repeats the bucket total across each hour. Detect
 * runs of identical non-zero values and divide so the per-hour value reflects
 * a true hourly amount (sum of the run still equals the bucket total).
 */
function deinterpolatePrecip(arr: (number | null)[]): (number | null)[] {
  const out = arr.slice();
  let i = 0;
  while (i < out.length) {
    const v = out[i];
    if (v == null || v === 0) { i++; continue; }
    let j = i + 1;
    while (j < out.length && out[j] === v) j++;
    const runLen = j - i;
    if (runLen >= 2) {
      const per = v / runLen;
      for (let k = i; k < j; k++) out[k] = per;
    }
    i = j;
  }
  return out;
}

/** Trim trailing entries where the primary signal (temperature) is null. */
function trimTrailingNulls(
  arrays: Record<string, (number | null)[]>,
  hours: number[],
  primaryKey: string
): { hours: number[]; arrays: Record<string, (number | null)[]> } {
  const primary = arrays[primaryKey];
  let end = primary.length;
  while (end > 0 && primary[end - 1] == null) end--;
  if (end === primary.length) return { hours, arrays };
  const trimmed: Record<string, (number | null)[]> = {};
  for (const k of Object.keys(arrays)) trimmed[k] = arrays[k].slice(0, end);
  return { hours: hours.slice(0, end), arrays: trimmed };
}

function parseModelResponse(data: any, modelName: string, color: string): ParseResult | null {
  const hourly = data.hourly;
  if (!hourly || !hourly.time || hourly.time.length === 0) return null;

  const startTimeISO = hourly.time[0] as string;
  const startTime = new Date(startTimeISO).getTime();

  const rawHours: number[] = [];
  const rawTemp: (number | null)[] = [];
  const rawPrecip: (number | null)[] = [];
  const rawWind: (number | null)[] = [];
  const rawGusts: (number | null)[] = [];
  const rawPressure: (number | null)[] = [];
  const rawHumidity: (number | null)[] = [];
  const rawDew: (number | null)[] = [];
  const rawCape: (number | null)[] = [];
  const rawTemp850: (number | null)[] = [];
  const rawTemp500: (number | null)[] = [];
  const rawApparent: (number | null)[] = [];
  const rawCloud: (number | null)[] = [];
  const rawSnow: (number | null)[] = [];
  const rawSnowDepth: (number | null)[] = [];

  for (let i = 0; i < hourly.time.length; i++) {
    const h = Math.round((new Date(hourly.time[i]).getTime() - startTime) / 3600000);
    if (h > MAX_HOURS) break;

    rawHours.push(h);
    rawTemp.push(hourly.temperature_2m?.[i] ?? null);
    rawPrecip.push(hourly.precipitation?.[i] ?? null);
    rawWind.push(hourly.wind_speed_10m?.[i] ?? null);
    rawGusts.push(hourly.wind_gusts_10m?.[i] ?? null);
    rawPressure.push(hourly.pressure_msl?.[i] ?? null);
    rawHumidity.push(hourly.relative_humidity_2m?.[i] ?? null);
    rawDew.push(hourly.dew_point_2m?.[i] ?? null);
    {
      const c = hourly.cape?.[i];
      rawCape.push(c == null ? null : Math.max(0, c));
    }
    rawTemp850.push(hourly.temperature_850hPa?.[i] ?? null);
    rawTemp500.push(hourly.temperature_500hPa?.[i] ?? null);
    rawApparent.push(hourly.apparent_temperature?.[i] ?? null);
    rawCloud.push(hourly.cloud_cover?.[i] ?? null);
    {
      const s = hourly.snowfall?.[i];
      rawSnow.push(s == null ? null : Math.max(0, s));
    }
    {
      const sd = hourly.snow_depth?.[i];
      rawSnowDepth.push(sd == null ? null : Math.max(0, sd * 100));
    }
  }

  if (rawHours.length === 0) return null;

  // Trim trailing nulls based on temperature (primary signal)
  const { hours: trimmedHours, arrays } = trimTrailingNulls(
    {
      temperature: rawTemp,
      precipitation: rawPrecip,
      windSpeed: rawWind,
      windGusts: rawGusts,
      pressure: rawPressure,
      humidity: rawHumidity,
      dewPoint: rawDew,
      cape: rawCape,
      temp850hPa: rawTemp850,
      temp500hPa: rawTemp500,
      apparentTemperature: rawApparent,
      cloudCover: rawCloud,
      snowfall: rawSnow,
      snowDepth: rawSnowDepth,
    },
    rawHours,
    "temperature"
  );

  if (trimmedHours.length === 0) return null;

  const precip = deinterpolatePrecip(arrays.precipitation);
  const snow = deinterpolatePrecip(arrays.snowfall);

  const precipTotal: (number | null)[] = [];
  let acc = 0;
  for (const v of precip) {
    if (v != null) acc += v;
    precipTotal.push(+acc.toFixed(2));
  }

  return {
    startTimeISO,
    model: {
      model: modelName,
      color,
      hours: trimmedHours,
      temperature: arrays.temperature as number[],
      precipitation: precip as number[],
      precipitationTotal: precipTotal as number[],
      windSpeed: arrays.windSpeed as number[],
      windGusts: arrays.windGusts as number[],
      pressure: arrays.pressure as number[],
      humidity: arrays.humidity as number[],
      dewPoint: arrays.dewPoint as number[],
      cape: arrays.cape as number[],
      temp850hPa: arrays.temp850hPa as number[],
      temp500hPa: arrays.temp500hPa as number[],
      apparentTemperature: arrays.apparentTemperature as number[],
      cloudCover: arrays.cloudCover as number[],
      snowfall: snow as number[],
      snowDepth: arrays.snowDepth as number[],
      dust: [] as number[],
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
      const result = parseModelResponse(data, cfg.displayName, cfg.color);
      // Update display name with actual forecast range
      if (result) {
        const maxH = result.model.hours[result.model.hours.length - 1];
        result.model.model = `${cfg.name} (${formatRun(cfg.run)} · ${maxH}h)`;
      }
      return result;
    } catch (e) {
      console.warn(`Failed to fetch ${cfg.displayName}:`, e);
      return null;
    }
  });

  const all = await Promise.all(fetches);
  const valid = all.filter((r): r is ParseResult => r !== null && r.model.hours.length > 0);
  const results = valid.map((r) => r.model);
  const startTime = valid[0]?.startTimeISO ?? new Date().toISOString();

  // Use the longest model's hours as the unified timeline
  if (results.length > 1) {
    const maxLen = Math.max(...results.map((r) => r.hours.length));
    const longestHours = results.find((r) => r.hours.length === maxLen)!.hours;
    const fields: (keyof ModelForecast)[] = [
      "temperature",
      "precipitation",
      "precipitationTotal",
      "windSpeed",
      "windGusts",
      "pressure",
      "humidity",
      "dewPoint",
      "cape",
      "temp850hPa",
      "temp500hPa",
      "apparentTemperature",
      "cloudCover",
      "snowfall",
      "snowDepth",
      "dust",
    ];
    for (const r of results) {
      if (r.hours.length < maxLen) {
        // Pad shorter models with null
        const padCount = maxLen - r.hours.length;
        r.hours = longestHours;
        for (const f of fields) {
          (r as any)[f] = [...(r as any)[f], ...Array(padCount).fill(null)];
        }
      }
    }
  }

  // Fetch air-quality once (UV/AQI/dust) — used both for Info tab and as
  // per-hour Saharan dust series broadcast to all models.
  let airInfo: AirInfo | undefined;
  if (results.length > 0) {
    try {
      const air = await fetchAirQuality(lat, lon, valid[0].startTimeISO);
      const len = results[0].hours.length;
      const dustAligned: number[] = [];
      for (let i = 0; i < len; i++) {
        dustAligned.push((air.dust[i] ?? null) as unknown as number);
      }
      for (const r of results) r.dust = dustAligned;
      airInfo = air;
    } catch (e) {
      console.warn("Failed to fetch air quality:", e);
    }
  }

  return { models: results, startTime, airInfo };
}

async function fetchAirQuality(lat: number, lon: number, startISO: string): Promise<AirInfo> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=european_aqi,uv_index,dust&forecast_days=5&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air-quality HTTP ${res.status}`);
  const data = await res.json();
  const times: string[] = data?.hourly?.time ?? [];
  const aqiVals: (number | null)[] = data?.hourly?.european_aqi ?? [];
  const uvVals: (number | null)[] = data?.hourly?.uv_index ?? [];
  const dustVals: (number | null)[] = data?.hourly?.dust ?? [];
  const startMs = new Date(startISO).getTime();
  const aqi: (number | null)[] = [];
  const uv: (number | null)[] = [];
  const dust: (number | null)[] = [];
  const hours: number[] = [];
  for (let i = 0; i < times.length; i++) {
    const h = Math.round((new Date(times[i]).getTime() - startMs) / 3600000);
    if (h < 0) continue;
    aqi[h] = aqiVals[i] ?? null;
    uv[h] = uvVals[i] ?? null;
    dust[h] = dustVals[i] ?? null;
  }
  const len = Math.max(aqi.length, uv.length, dust.length);
  for (let i = 0; i < len; i++) {
    if (aqi[i] === undefined) aqi[i] = null;
    if (uv[i] === undefined) uv[i] = null;
    if (dust[i] === undefined) dust[i] = null;
    hours.push(i);
  }
  return { hours, uvIndex: uv, aqi, dust };
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
