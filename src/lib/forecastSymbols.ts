// Shared logic for hourly + daily forecast symbol selection and averaging.
import { ModelForecast, WeatherParam } from "@/data/weatherApi";

export type RainLevel = "none" | "drizzle" | "light" | "moderate" | "heavy" | "torrential";
export type CloudLevel = "sunny" | "partly" | "mostly" | "cloudy";

export function rainLevel(mm: number): RainLevel {
  if (mm <= 0) return "none";
  if (mm <= 0.2) return "drizzle";
  if (mm <= 1.5) return "light";
  if (mm <= 4) return "moderate";
  if (mm <= 10) return "heavy";
  return "torrential";
}

export function cloudLevel(pct: number): CloudLevel {
  if (pct < 30) return "sunny";
  if (pct < 50) return "partly";
  if (pct < 80) return "mostly";
  return "cloudy";
}

// >= .5 round up, < .5 round down (Math.round already does this for positive numbers,
// but JS rounds .5 toward +∞ which is what we want).
export function roundHalfUp(v: number): number {
  return Math.floor(v + 0.5);
}

/** Average a single parameter across enabled models at one hour index, ignoring nulls. */
export function avgAt(
  models: ModelForecast[],
  enabled: string[],
  param: WeatherParam,
  hourIdx: number
): number | null {
  const vals: number[] = [];
  for (const m of models) {
    if (!enabled.includes(m.model)) continue;
    const arr = m[param] as (number | null)[] | undefined;
    if (!arr || hourIdx >= arr.length) continue;
    const v = arr[hourIdx];
    if (v == null || Number.isNaN(v)) continue;
    vals.push(v);
  }
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Should we show a wind icon for this hour? */
export function shouldShowWind(windKmh: number | null, gustsKmh: number | null): boolean {
  return (windKmh != null && windKmh > 50) || (gustsKmh != null && gustsKmh > 75);
}

export interface HourSummary {
  hourIdx: number;
  temp: number | null;
  humidity: number | null;
  precip: number | null;
  cloud: number | null;
  wind: number | null;
  gusts: number | null;
}

export function summarizeHour(
  models: ModelForecast[],
  enabled: string[],
  hourIdx: number
): HourSummary {
  return {
    hourIdx,
    temp: avgAt(models, enabled, "temperature", hourIdx),
    humidity: avgAt(models, enabled, "humidity", hourIdx),
    precip: avgAt(models, enabled, "precipitation", hourIdx),
    cloud: avgAt(models, enabled, "cloudCover", hourIdx),
    wind: avgAt(models, enabled, "windSpeed", hourIdx),
    gusts: avgAt(models, enabled, "windGusts", hourIdx),
  };
}
