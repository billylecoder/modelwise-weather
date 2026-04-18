// Unit conversion + smart rounding utilities
import { WeatherParam } from "@/data/weatherApi";

export type TempUnit = "C" | "F";
export type PrecipUnit = "mm" | "cm" | "in";
export type WindUnit = "kmh" | "mph" | "kt" | "bf";
export type PressureUnit = "hPa" | "mb";

export interface UnitPrefs {
  temperature: TempUnit;
  precipitation: PrecipUnit;
  wind: WindUnit;
  pressure: PressureUnit;
}

export const defaultUnits: UnitPrefs = {
  temperature: "C",
  precipitation: "mm",
  wind: "kmh",
  pressure: "hPa",
};

export const unitLabels = {
  temperature: { C: "°C", F: "°F" } as Record<TempUnit, string>,
  precipitation: { mm: "mm", cm: "cm", in: "in" } as Record<PrecipUnit, string>,
  wind: { kmh: "km/h", mph: "mph", kt: "kt", bf: "bf" } as Record<WindUnit, string>,
  pressure: { hPa: "hPa", mb: "mb" } as Record<PressureUnit, string>,
};

// Map weather params to a conversion category
export type UnitCategory = "temperature" | "precipitation" | "wind" | "pressure" | "none";

export function getCategory(param: WeatherParam): UnitCategory {
  switch (param) {
    case "temperature":
    case "apparentTemperature":
    case "dewPoint":
    case "temp850hPa":
    case "temp500hPa":
      return "temperature";
    case "precipitation":
    case "precipitationTotal":
      return "precipitation";
    case "windSpeed":
    case "windGusts":
      return "wind";
    case "pressure":
      return "pressure";
    default:
      return "none";
  }
}

// ---------------- Raw conversions (raw API units → target) ----------------
// Raw units from Open-Meteo: temp °C, precip mm, wind km/h, pressure hPa.
function convertTemp(c: number, u: TempUnit): number {
  return u === "F" ? c * 9 / 5 + 32 : c;
}
function convertPrecip(mm: number, u: PrecipUnit): number {
  if (u === "cm") return mm / 10;
  if (u === "in") return mm / 25.4;
  return mm;
}
function convertWind(kmh: number, u: WindUnit): number {
  if (u === "mph") return kmh * 0.621371;
  if (u === "kt") return kmh * 0.539957;
  if (u === "bf") {
    // Beaufort scale from km/h
    const ms = kmh / 3.6;
    const bf = Math.cbrt((ms / 0.836) ** 2);
    return bf;
  }
  return kmh;
}
function convertPressure(hpa: number, u: PressureUnit): number {
  return hpa; // hPa and mb are numerically identical
}

export function convertValue(
  raw: number | null | undefined,
  param: WeatherParam,
  prefs: UnitPrefs
): number | null {
  if (raw === null || raw === undefined || Number.isNaN(raw)) return null;
  const cat = getCategory(param);
  switch (cat) {
    case "temperature":
      return convertTemp(raw, prefs.temperature);
    case "precipitation":
      return convertPrecip(raw, prefs.precipitation);
    case "wind":
      return convertWind(raw, prefs.wind);
    case "pressure":
      return convertPressure(raw, prefs.pressure);
    default:
      return raw;
  }
}

export function getUnitLabel(param: WeatherParam, prefs: UnitPrefs, fallback: string): string {
  const cat = getCategory(param);
  if (cat === "temperature") return unitLabels.temperature[prefs.temperature];
  if (cat === "precipitation") return unitLabels.precipitation[prefs.precipitation];
  if (cat === "wind") return unitLabels.wind[prefs.wind];
  if (cat === "pressure") return unitLabels.pressure[prefs.pressure];
  return fallback;
}

// ---------------- Smart rounding ----------------
// Small-scale units (inches, feet) -> round to 0.05 (val<1) or 0.1 (val>=1)
// Beaufort -> integer
// Everything else -> normal rounding (>=.5 up, <.5 down) to 1 decimal for small,
// integer for large magnitudes.
function roundToStep(v: number, step: number): number {
  return Math.round(v / step) * step;
}

export function smartRound(
  value: number,
  param: WeatherParam,
  prefs: UnitPrefs
): number {
  const cat = getCategory(param);

  // Small-scale: inches
  if (cat === "precipitation" && prefs.precipitation === "in") {
    const step = Math.abs(value) < 1 ? 0.05 : 0.1;
    return +roundToStep(value, step).toFixed(2);
  }

  // Beaufort -> integer
  if (cat === "wind" && prefs.wind === "bf") {
    return Math.round(value);
  }

  // Temperature / wind / pressure / cm-precip / mm-precip → normal rounding
  if (cat === "temperature") return Math.round(value * 10) / 10;
  if (cat === "pressure") return Math.round(value);
  if (cat === "wind") return Math.round(value);
  if (cat === "precipitation") {
    // mm and cm: 1 decimal
    return Math.round(value * 10) / 10;
  }
  // humidity, cloud cover, cape: integer
  return Math.round(value);
}

export function formatValue(
  raw: number | null | undefined,
  param: WeatherParam,
  prefs: UnitPrefs
): string {
  const converted = convertValue(raw, param, prefs);
  if (converted === null) return "-";
  return String(smartRound(converted, param, prefs));
}
