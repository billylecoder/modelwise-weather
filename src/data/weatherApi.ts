export interface RunTransition {
  /** Local-naive hour offset (matches `hours[]`) where this transition begins. */
  hour: number;
  /** Run label being switched FROM (e.g. "06z"). */
  fromRun: string;
  /** Run label being switched TO (e.g. "00z"). */
  toRun: string;
}

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
  windDirection: number[];
  // Lightning + severe-weather parameters (may be null for models that don't expose them)
  lightning?: (number | null)[];
  liftedIndex?: (number | null)[];
  cin?: (number | null)[];
  shear0_1km?: (number | null)[];
  shear0_3km?: (number | null)[];
  shear0_6km?: (number | null)[];
  freezingLevel?: (number | null)[];
  /** Latest run cycle used for the leading portion of the data (e.g. "06z"). */
  runLabel?: string;
  /** Run-cycle max forecast hours, e.g. 144 for ECMWF 06z. */
  runMaxHours?: number;
  /** Hours at which the underlying run source changes (cached older but longer run takes over). */
  transitions?: RunTransition[];
}


export interface AirInfo {
  hours: number[];
  uvIndex: (number | null)[];
  aqi: (number | null)[];
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

export type WeatherParam =
  | "temperature"
  | "precipitation"
  | "precipitationTotal"
  | "windSpeed"
  | "windGusts"
  | "pressure"
  | "humidity"
  | "dewPoint"
  | "cape"
  | "temp850hPa"
  | "temp500hPa"
  | "apparentTemperature"
  | "cloudCover"
  | "snowfall"
  | "snowDepth"
  | "windDirection"
  | "lightning"
  | "liftedIndex"
  | "cin"
  | "shear0_1km"
  | "shear0_3km"
  | "shear0_6km"
  | "freezingLevel";

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
  windDirection: { label: "Wind Direction", unit: "°", icon: "Compass" },
  lightning: { label: "Lightning Pot.", unit: "J/kg", icon: "Zap" },
  liftedIndex: { label: "Lifted Index", unit: "K", icon: "Thermometer" },
  cin: { label: "CIN", unit: "J/kg", icon: "Zap" },
  shear0_1km: { label: "0–1km Shear", unit: "km/h", icon: "Wind" },
  shear0_3km: { label: "0–3km Shear", unit: "km/h", icon: "Wind" },
  shear0_6km: { label: "0–6km Shear", unit: "km/h", icon: "Wind" },
  freezingLevel: { label: "Freezing Lvl", unit: "m", icon: "Snowflake" },
};


// ---------------------------------------------------------------------------
// Model run schedules
//   runs: { hour: UTC, maxHours: forecast length for that run }
//   delayHours: typical lag between run start and data availability
// ---------------------------------------------------------------------------
interface RunSpec { hour: number; maxHours: number }
interface ModelConfig {
  id: string;
  name: string;
  color: string;
  runs: RunSpec[];
  delayHours: number;
  /** Cap the data we keep regardless of what the model actually outputs. */
  hardCapHours: number;
}

const MODEL_DEFS: ModelConfig[] = [
  {
    id: "ecmwf_ifs025",
    name: "ECMWF",
    color: "hsl(200, 80%, 55%)",
    runs: [
      { hour: 0,  maxHours: 360 },
      { hour: 6,  maxHours: 144 },
      { hour: 12, maxHours: 360 },
      { hour: 18, maxHours: 144 },
    ],
    delayHours: 6,
    hardCapHours: 360,
  },
  {
    id: "gfs_seamless",
    name: "GFS",
    color: "hsl(140, 70%, 50%)",
    // GFS runs 384h on every cycle; we cap at 360h per product spec.
    runs: [
      { hour: 0,  maxHours: 360 },
      { hour: 6,  maxHours: 360 },
      { hour: 12, maxHours: 360 },
      { hour: 18, maxHours: 360 },
    ],
    delayHours: 5,
    hardCapHours: 360,
  },
  {
    id: "icon_global",
    name: "ICON",
    color: "hsl(280, 70%, 60%)",
    runs: [
      { hour: 0,  maxHours: 180 },
      { hour: 6,  maxHours: 120 },
      { hour: 12, maxHours: 180 },
      { hour: 18, maxHours: 120 },
    ],
    delayHours: 4,
    hardCapHours: 180,
  },
  {
    id: "gem_seamless",
    name: "GEM",
    color: "hsl(30, 90%, 55%)",
    runs: [
      { hour: 0,  maxHours: 240 },
      { hour: 12, maxHours: 240 },
    ],
    delayHours: 6,
    hardCapHours: 240,
  },
  {
    // ECMWF AIFS — Open-Meteo model id "ecmwf_aifs025". Runs 4x/day, 240h horizon.
    // Some parameters (e.g. CAPE, pressure-level winds) may be absent — values will be null.
    id: "ecmwf_aifs025",
    name: "AIFS",
    color: "hsl(320, 80%, 65%)",
    runs: [
      { hour: 0,  maxHours: 240 },
      { hour: 6,  maxHours: 240 },
      { hour: 12, maxHours: 240 },
      { hour: 18, maxHours: 240 },
    ],
    delayHours: 7,
    hardCapHours: 240,
  },
];

function formatRun(runHour: number): string {
  return `${String(runHour).padStart(2, "0")}z`;
}

/** Returns date keyed as YYYY-MM-DD (UTC). */
function utcDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** All recent run cycles (most-recent first), each annotated with absolute UTC ms. */
function pastRunCycles(def: ModelConfig, now = Date.now(), lookbackHours = 96):
  Array<{ run: RunSpec; runDateUTC: string; runStartMs: number }> {
  const out: Array<{ run: RunSpec; runDateUTC: string; runStartMs: number }> = [];
  const earliest = now - lookbackHours * 3600000;
  // Walk back day by day
  const today = new Date(now);
  const todayUTCms = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (let dayOffset = 0; dayOffset <= Math.ceil(lookbackHours / 24) + 1; dayOffset++) {
    const dayMs = todayUTCms - dayOffset * 86400000;
    for (const r of def.runs) {
      const runStartMs = dayMs + r.hour * 3600000;
      if (runStartMs > now) continue;
      if (runStartMs < earliest) continue;
      // Only consider runs whose data has had time to publish
      if (runStartMs + def.delayHours * 3600000 > now) continue;
      out.push({ run: r, runDateUTC: utcDateKey(runStartMs), runStartMs });
    }
  }
  out.sort((a, b) => b.runStartMs - a.runStartMs);
  return out;
}

export interface ModelWithRun {
  id: string;
  name: string;
  displayName: string;
  color: string;
  run: number;
  runMaxHours: number;
}

export function getActiveModels(): ModelWithRun[] {
  return MODEL_DEFS.map((def) => {
    const latest = pastRunCycles(def)[0];
    const runHour = latest?.run.hour ?? def.runs[0].hour;
    const runMaxHours = latest?.run.maxHours ?? def.runs[0].maxHours;
    return {
      id: def.id,
      name: def.name,
      displayName: `${def.name} (${formatRun(runHour)})`,
      color: def.color,
      run: runHour,
      runMaxHours,
    };
  });
}

export const MODEL_CONFIGS = MODEL_DEFS.map((d) => ({ id: d.id, name: d.name, color: d.color }));

// ---------------------------------------------------------------------------
// Backend (optional FastAPI) — falls back to direct Open-Meteo
// ---------------------------------------------------------------------------
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export interface FetchResult {
  models: ModelForecast[];
  startTime: string;
  airInfo?: AirInfo;
}

async function fetchFromBackend(lat: number, lon: number): Promise<FetchResult> {
  const url = `${BACKEND_URL}/api/forecast?lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Open-Meteo direct fetch
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
  "wind_direction_10m",
  "weather_code",
  "visibility",
  // Severe / lightning parameters (some models won't return these — values will be null)
  "lightning_potential",
  "lifted_index",
  "convective_inhibition",
  "freezing_level_height",
  "wind_speed_925hPa",
  "wind_direction_925hPa",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "wind_speed_500hPa",
  "wind_direction_500hPa",
];


const NUMERIC_FIELDS: (keyof ModelForecast)[] = [
  "temperature", "precipitation", "precipitationTotal", "windSpeed", "windGusts",
  "pressure", "humidity", "dewPoint", "cape", "temp850hPa", "temp500hPa",
  "apparentTemperature", "cloudCover", "snowfall", "snowDepth", "windDirection",
];

function buildApiUrl(lat: number, lon: number, modelId: string): string {
  const params = HOURLY_PARAMS.join(",");
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&models=${modelId}&forecast_days=16&timezone=auto`;
}

interface ParseResult {
  startTimeISO: string;
  utcOffsetSec: number;
  hours: number[];
  arrays: Record<string, (number | null)[]>;
}

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

function parseRaw(data: any): ParseResult | null {
  const hourly = data?.hourly;
  if (!hourly?.time?.length) return null;
  const startTimeISO = hourly.time[0] as string;
  const utcOffsetSec: number = typeof data?.utc_offset_seconds === "number" ? data.utc_offset_seconds : 0;
  const startMs = new Date(startTimeISO).getTime();

  const hours: number[] = [];
  const arr = (k: string) => (hourly[k] as (number | null)[] | undefined) ?? [];
  const out: Record<string, (number | null)[]> = {
    temperature: [], precipitation: [], windSpeed: [], windGusts: [],
    pressure: [], humidity: [], dewPoint: [], cape: [], temp850hPa: [], temp500hPa: [],
    apparentTemperature: [], cloudCover: [], snowfall: [], snowDepth: [], windDirection: [],
    lightning: [], liftedIndex: [], cin: [], freezingLevel: [],
    shear0_1km: [], shear0_3km: [], shear0_6km: [],
  };

  // Bulk shear magnitude (km/h) between two wind layers (speed + direction).
  const toRad = (d: number) => (d * Math.PI) / 180;
  const shearMag = (s1: number | null | undefined, d1: number | null | undefined,
                    s2: number | null | undefined, d2: number | null | undefined): number | null => {
    if (s1 == null || d1 == null || s2 == null || d2 == null) return null;
    const u1 = s1 * Math.sin(toRad(d1)), v1 = s1 * Math.cos(toRad(d1));
    const u2 = s2 * Math.sin(toRad(d2)), v2 = s2 * Math.cos(toRad(d2));
    return Math.sqrt((u1 - u2) ** 2 + (v1 - v2) ** 2);
  };

  for (let i = 0; i < hourly.time.length; i++) {
    const h = Math.round((new Date(hourly.time[i]).getTime() - startMs) / 3600000);
    hours.push(h);
    out.temperature.push(arr("temperature_2m")[i] ?? null);
    out.precipitation.push(arr("precipitation")[i] ?? null);
    out.windSpeed.push(arr("wind_speed_10m")[i] ?? null);
    out.windGusts.push(arr("wind_gusts_10m")[i] ?? null);
    out.pressure.push(arr("pressure_msl")[i] ?? null);
    out.humidity.push(arr("relative_humidity_2m")[i] ?? null);
    out.dewPoint.push(arr("dew_point_2m")[i] ?? null);
    const c = arr("cape")[i]; out.cape.push(c == null ? null : Math.max(0, c));
    out.temp850hPa.push(arr("temperature_850hPa")[i] ?? null);
    out.temp500hPa.push(arr("temperature_500hPa")[i] ?? null);
    out.apparentTemperature.push(arr("apparent_temperature")[i] ?? null);
    out.cloudCover.push(arr("cloud_cover")[i] ?? null);
    const s = arr("snowfall")[i]; out.snowfall.push(s == null ? null : Math.max(0, s));
    const sd = arr("snow_depth")[i]; out.snowDepth.push(sd == null ? null : Math.max(0, sd * 100));
    const wd = arr("wind_direction_10m")[i]; out.windDirection.push(wd == null ? null : ((wd % 360) + 360) % 360);

    const lp = arr("lightning_potential")[i];
    out.lightning.push(lp == null ? null : Math.max(0, lp));
    out.liftedIndex.push(arr("lifted_index")[i] ?? null);
    const ci = arr("convective_inhibition")[i];
    out.cin.push(ci == null ? null : ci);
    const fl = arr("freezing_level_height")[i];
    out.freezingLevel.push(fl == null ? null : Math.max(0, fl));

    const ws10 = arr("wind_speed_10m")[i], wd10 = arr("wind_direction_10m")[i];
    const ws925 = arr("wind_speed_925hPa")[i], wd925 = arr("wind_direction_925hPa")[i];
    const ws700 = arr("wind_speed_700hPa")[i], wd700 = arr("wind_direction_700hPa")[i];
    const ws500 = arr("wind_speed_500hPa")[i], wd500 = arr("wind_direction_500hPa")[i];
    out.shear0_1km.push(shearMag(ws10, wd10, ws925, wd925));
    out.shear0_3km.push(shearMag(ws10, wd10, ws700, wd700));
    out.shear0_6km.push(shearMag(ws10, wd10, ws500, wd500));
  }

  // Trim trailing nulls based on temperature
  let end = out.temperature.length;
  while (end > 0 && out.temperature[end - 1] == null) end--;
  if (end === 0) return null;
  const hoursT = hours.slice(0, end);
  for (const k of Object.keys(out)) out[k] = out[k].slice(0, end);

  out.precipitation = deinterpolatePrecip(out.precipitation);
  out.snowfall = deinterpolatePrecip(out.snowfall);

  return { startTimeISO, utcOffsetSec, hours: hoursT, arrays: out };
}


// ---------------------------------------------------------------------------
// LocalStorage cache for run cycles. Lets us splice in a longer prior run
// (e.g. 00z 360h) when the latest run (e.g. 06z 144h) is shorter.
// ---------------------------------------------------------------------------
interface CachedRun {
  modelId: string;
  runHour: number;
  runDateUTC: string;
  runMaxHours: number;
  startTimeISO: string;
  utcOffsetSec: number;
  hours: number[];
  arrays: Record<string, (number | null)[]>;
  fetchedAt: number;
}

const CACHE_VERSION = "v2";
const cacheKey = (modelId: string, lat: number, lon: number) =>
  `wi:${CACHE_VERSION}:${modelId}:${lat.toFixed(2)}:${lon.toFixed(2)}`;

function loadCache(modelId: string, lat: number, lon: number): CachedRun[] {
  try {
    const raw = localStorage.getItem(cacheKey(modelId, lat, lon));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveCache(modelId: string, lat: number, lon: number, entries: CachedRun[]) {
  try {
    // Keep at most 8 most-recent, drop anything older than 7 days
    const cutoff = Date.now() - 7 * 86400000;
    const dedup = new Map<string, CachedRun>();
    for (const e of entries) {
      if (e.fetchedAt < cutoff) continue;
      dedup.set(`${e.runDateUTC}:${e.runHour}`, e);
    }
    const list = [...dedup.values()]
      .sort((a, b) => b.fetchedAt - a.fetchedAt)
      .slice(0, 8);
    localStorage.setItem(cacheKey(modelId, lat, lon), JSON.stringify(list));
  } catch { /* quota — ignore */ }
}

/** Compute absolute UTC ms at a given local-naive hour offset. */
function absMs(startTimeISO: string, utcOffsetSec: number, hourOffset: number): number {
  return new Date(startTimeISO).getTime() - utcOffsetSec * 1000 + hourOffset * 3600000;
}

/** Truncate parsed data so nothing extends past `runStartMs + runMaxHours`. */
function truncateToRun(p: ParseResult, runStartMs: number, runMaxHours: number): ParseResult {
  const cutoffMs = runStartMs + runMaxHours * 3600000;
  const startAbsMs = absMs(p.startTimeISO, p.utcOffsetSec, 0);
  const lastIdx = p.hours.findIndex((h) => startAbsMs + h * 3600000 > cutoffMs);
  if (lastIdx === -1) return p;
  const newHours = p.hours.slice(0, lastIdx);
  const newArrays: Record<string, (number | null)[]> = {};
  for (const k of Object.keys(p.arrays)) newArrays[k] = p.arrays[k].slice(0, lastIdx);
  return { ...p, hours: newHours, arrays: newArrays };
}

/**
 * Splice in extension data from a longer prior run. Both `latest` and `prior`
 * are aligned by absolute UTC time. Returns the extended series plus the
 * transition marker (hour relative to `latest.startTimeISO`).
 */
function spliceExtension(
  latest: ParseResult,
  latestRunLabel: string,
  prior: CachedRun,
  priorRunLabel: string,
): { parsed: ParseResult; transition: RunTransition | null } {
  const latestStartAbs = absMs(latest.startTimeISO, latest.utcOffsetSec, 0);
  const priorStartAbs = absMs(prior.startTimeISO, prior.utcOffsetSec, 0);
  const offsetH = Math.round((priorStartAbs - latestStartAbs) / 3600000);

  // The last hour latest currently has
  const latestLastHour = latest.hours[latest.hours.length - 1] ?? -1;
  // The last hour the prior cache provides, expressed in latest's grid
  const priorLastInLatest = (prior.hours[prior.hours.length - 1] ?? -1) + offsetH;
  if (priorLastInLatest <= latestLastHour) {
    return { parsed: latest, transition: null };
  }

  // Build extended arrays
  const newHours = latest.hours.slice();
  const newArrays: Record<string, (number | null)[]> = {};
  for (const k of Object.keys(latest.arrays)) newArrays[k] = latest.arrays[k].slice();

  for (let h = latestLastHour + 1; h <= priorLastInLatest; h++) {
    const priorIdx = h - offsetH;
    const priorHourPos = prior.hours.indexOf(priorIdx);
    if (priorHourPos === -1) continue;
    newHours.push(h);
    for (const k of Object.keys(newArrays)) {
      const src = prior.arrays[k] ?? [];
      newArrays[k].push(src[priorHourPos] ?? null);
    }
  }

  if (newHours.length === latest.hours.length) {
    return { parsed: latest, transition: null };
  }

  const transition: RunTransition = {
    hour: latestLastHour + 1,
    fromRun: latestRunLabel,
    toRun: priorRunLabel,
  };
  return { parsed: { ...latest, hours: newHours, arrays: newArrays }, transition };
}

async function fetchOneModel(
  lat: number, lon: number, def: ModelConfig,
): Promise<{ parsed: ParseResult; runLabel: string; runMaxHours: number; transitions: RunTransition[]; runStartMs: number } | null> {
  let raw: ParseResult | null = null;
  try {
    const res = await fetch(buildApiUrl(lat, lon, def.id));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = parseRaw(await res.json());
  } catch (e) {
    console.warn(`Failed to fetch ${def.name}:`, e);
    return null;
  }
  if (!raw) return null;

  const cycles = pastRunCycles(def);
  const active = cycles[0];
  if (!active) return null;
  const runLabel = formatRun(active.run.hour);

  const cappedMax = Math.min(active.run.maxHours, def.hardCapHours);
  let truncated = truncateToRun(raw, active.runStartMs, cappedMax);

  const cache = loadCache(def.id, lat, lon);
  const fresh: CachedRun = {
    modelId: def.id,
    runHour: active.run.hour,
    runDateUTC: active.runDateUTC,
    runMaxHours: cappedMax,
    startTimeISO: truncated.startTimeISO,
    utcOffsetSec: truncated.utcOffsetSec,
    hours: truncated.hours,
    arrays: truncated.arrays,
    fetchedAt: Date.now(),
  };
  saveCache(def.id, lat, lon, [fresh, ...cache]);

  const candidates = [fresh, ...cache];
  const withAbsEnd = candidates
    .filter((c) => !(c.runDateUTC === active.runDateUTC && c.runHour === active.run.hour))
    .map((c) => {
      const startAbs = absMs(c.startTimeISO, c.utcOffsetSec, 0);
      const endAbs = startAbs + (c.hours[c.hours.length - 1] ?? 0) * 3600000;
      return { c, endAbs };
    })
    .sort((a, b) => b.endAbs - a.endAbs);

  const transitions: RunTransition[] = [];
  if (withAbsEnd.length > 0) {
    const best = withAbsEnd[0];
    const latestEndAbs = absMs(truncated.startTimeISO, truncated.utcOffsetSec, truncated.hours[truncated.hours.length - 1] ?? 0);
    if (best.endAbs > latestEndAbs) {
      const priorLabel = formatRun(best.c.runHour);
      const result = spliceExtension(truncated, runLabel, best.c, priorLabel);
      truncated = result.parsed;
      if (result.transition) transitions.push(result.transition);
    }
  }

  return { parsed: truncated, runLabel, runMaxHours: cappedMax, transitions, runStartMs: active.runStartMs };
}

function buildPrecipTotal(precip: (number | null)[]): number[] {
  let acc = 0;
  return precip.map((v) => { if (v != null) acc += v; return +acc.toFixed(2); });
}

async function fetchDirectFromOpenMeteo(lat: number, lon: number): Promise<FetchResult> {
  const results = await Promise.all(MODEL_DEFS.map((def) => fetchOneModel(lat, lon, def)));
  const valid: Array<{
    def: ModelConfig;
    parsed: ParseResult;
    runLabel: string;
    runMaxHours: number;
    transitions: RunTransition[];
    runStartMs: number;
  }> = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r) valid.push({ def: MODEL_DEFS[i], ...r });
  }

  if (valid.length === 0) {
    return { models: [], startTime: new Date().toISOString() };
  }

  // Anchor the unified timeline to ECMWF's latest run start time (UTC).
  // Falls back to the earliest model start if ECMWF is unavailable.
  const ecmwf = valid.find((v) => v.def.id === "ecmwf_ifs025");
  const startAbsList = valid.map((v) => absMs(v.parsed.startTimeISO, v.parsed.utcOffsetSec, 0));
  const anchorAbsMs = ecmwf ? ecmwf.runStartMs : Math.min(...startAbsList);
  // Express anchor in the location's local-naive form (the rest of the app
  // uses parseLocalNaiveISO and expects "YYYY-MM-DDTHH:mm" wall-clock).
  const tzOffsetSec = valid[0].parsed.utcOffsetSec;
  const anchorLocal = new Date(anchorAbsMs + tzOffsetSec * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const globalStartIso =
    `${anchorLocal.getUTCFullYear()}-${pad(anchorLocal.getUTCMonth() + 1)}-${pad(anchorLocal.getUTCDate())}` +
    `T${pad(anchorLocal.getUTCHours())}:${pad(anchorLocal.getUTCMinutes())}`;

  // Cap entire timeline to 360h from anchor (longest model horizon).
  const GLOBAL_CAP_H = 360;
  let maxUnifiedHour = 0;
  for (const v of valid) {
    const offsetH = Math.round((absMs(v.parsed.startTimeISO, v.parsed.utcOffsetSec, 0) - anchorAbsMs) / 3600000);
    const last = (v.parsed.hours[v.parsed.hours.length - 1] ?? 0) + offsetH;
    // Per-model cap from anchor = model.hardCapHours (model runs measured from ECMWF anchor)
    const cappedLast = Math.min(last, v.def.hardCapHours);
    if (cappedLast > maxUnifiedHour) maxUnifiedHour = cappedLast;
  }
  maxUnifiedHour = Math.min(maxUnifiedHour, GLOBAL_CAP_H);
  if (maxUnifiedHour < 0) maxUnifiedHour = 0;
  const unifiedHours = Array.from({ length: maxUnifiedHour + 1 }, (_, i) => i);

  const models: ModelForecast[] = valid.map((v) => {
    const offsetH = Math.round((absMs(v.parsed.startTimeISO, v.parsed.utcOffsetSec, 0) - anchorAbsMs) / 3600000);
    const idxMap = new Map<number, number>();
    v.parsed.hours.forEach((h, i) => idxMap.set(h + offsetH, i));
    const modelMaxHour = Math.min(v.def.hardCapHours, maxUnifiedHour);
    const realign = (arr: (number | null)[]): (number | null)[] =>
      unifiedHours.map((h) => {
        if (h < 0 || h > modelMaxHour) return null;
        const i = idxMap.get(h);
        return i == null ? null : arr[i] ?? null;
      });

    const realigned: Record<string, (number | null)[]> = {};
    for (const k of Object.keys(v.parsed.arrays)) realigned[k] = realign(v.parsed.arrays[k]);
    const precipTotal = buildPrecipTotal(realigned.precipitation);

    const transitions = v.transitions
      .map((t) => ({ ...t, hour: t.hour + offsetH }))
      .filter((t) => t.hour >= 0 && t.hour <= maxUnifiedHour);

    return {
      model: `${v.def.name} (${v.runLabel} · ${v.runMaxHours}h)`,
      color: v.def.color,
      hours: unifiedHours,
      temperature: realigned.temperature as number[],
      precipitation: realigned.precipitation as number[],
      precipitationTotal: precipTotal,
      windSpeed: realigned.windSpeed as number[],
      windGusts: realigned.windGusts as number[],
      pressure: realigned.pressure as number[],
      humidity: realigned.humidity as number[],
      dewPoint: realigned.dewPoint as number[],
      cape: realigned.cape as number[],
      temp850hPa: realigned.temp850hPa as number[],
      temp500hPa: realigned.temp500hPa as number[],
      apparentTemperature: realigned.apparentTemperature as number[],
      cloudCover: realigned.cloudCover as number[],
      snowfall: realigned.snowfall as number[],
      snowDepth: realigned.snowDepth as number[],
      windDirection: realigned.windDirection as number[],
      lightning: realigned.lightning,
      liftedIndex: realigned.liftedIndex,
      cin: realigned.cin,
      shear0_1km: realigned.shear0_1km,
      shear0_3km: realigned.shear0_3km,
      shear0_6km: realigned.shear0_6km,
      freezingLevel: realigned.freezingLevel,
      runLabel: v.runLabel,
      runMaxHours: v.runMaxHours,
      transitions,
    };
  });

  let airInfo: AirInfo | undefined;
  try {
    airInfo = await fetchAirQuality(lat, lon, globalStartIso);
  } catch (e) {
    console.warn("Failed to fetch air quality:", e);
  }

  return { models, startTime: globalStartIso, airInfo };
}

async function fetchAirQuality(lat: number, lon: number, startISO: string): Promise<AirInfo> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=european_aqi,uv_index&forecast_days=5&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air-quality HTTP ${res.status}`);
  const data = await res.json();
  const times: string[] = data?.hourly?.time ?? [];
  const aqiVals: (number | null)[] = data?.hourly?.european_aqi ?? [];
  const uvVals: (number | null)[] = data?.hourly?.uv_index ?? [];
  const startMs = new Date(startISO).getTime();
  const aqi: (number | null)[] = [];
  const uv: (number | null)[] = [];
  const hours: number[] = [];
  for (let i = 0; i < times.length; i++) {
    const h = Math.round((new Date(times[i]).getTime() - startMs) / 3600000);
    if (h < 0) continue;
    aqi[h] = aqiVals[i] ?? null;
    uv[h] = uvVals[i] ?? null;
  }
  const len = Math.max(aqi.length, uv.length);
  for (let i = 0; i < len; i++) {
    if (aqi[i] === undefined) aqi[i] = null;
    if (uv[i] === undefined) uv[i] = null;
    hours.push(i);
  }
  return { hours, uvIndex: uv, aqi };
}

// silence unused import for NUMERIC_FIELDS (kept exported-style for future use)
void NUMERIC_FIELDS;

export async function fetchWeatherData(lat: number, lon: number): Promise<FetchResult> {
  if (BACKEND_URL) {
    try { return await fetchFromBackend(lat, lon); }
    catch (e) { console.warn("Backend unavailable, falling back to direct Open-Meteo:", e); }
  }
  return fetchDirectFromOpenMeteo(lat, lon);
}
