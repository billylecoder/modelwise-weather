import { useMemo } from "react";
import { ModelForecast, WeatherParam } from "@/data/weatherApi";
import { useI18n } from "@/i18n";
import { useUnits } from "@/contexts/UnitsContext";
import { convertValue, smartRound } from "@/lib/units";

interface ModelConfidenceProps {
  models: ModelForecast[];
  parameter: WeatherParam;
  enabledModels: string[];
  forecastHour: number;
}

type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Adaptive confidence based on parameter, average intensity, and spread.
 *
 * Spec:
 *  - precipitation: low values stay sensitive; higher intensity tolerates larger absolute spread.
 *  - windSpeed: ≤10 km/h → always high; >10 → larger wind tolerates larger spread.
 *  - windGusts: ≤20 km/h → always high; >20 → larger gusts tolerate larger spread.
 *  - cape: ≤50 J/kg → always high; >50 → larger CAPE tolerates larger spread.
 *  - other params: original relative-spread thresholds (10% / 30%).
 */
function computeConfidence(parameter: WeatherParam, avg: number, spread: number): ConfidenceLevel {
  // Floor-based adaptive: low/med/high thresholds scale with intensity above a floor.
  // ratio = spread / max(|avg|, floor). Below the floor, parameter is "calm" → high confidence.
  const adaptive = (
    floor: number,
    intensity: number,
    spr: number,
    medRatio: number,
    lowRatio: number
  ): ConfidenceLevel => {
    if (intensity <= floor) return "high";
    const denom = Math.max(Math.abs(intensity), floor);
    const r = spr / denom;
    if (r > lowRatio) return "low";
    if (r > medRatio) return "medium";
    return "high";
  };

  switch (parameter) {
    case "precipitation":
    case "precipitationTotal": {
      // Low values: 0–0.1 mm — tiny absolute spread already meaningful.
      // Higher intensity: spread must grow proportionally.
      if (avg <= 0.1) {
        if (spread > 0.3) return "low";
        if (spread > 0.1) return "medium";
        return "high";
      }
      // Floor 1mm: 5,6,7 (avg 6, spread 2) → r ≈ 0.33 → medium-ish; 5,10,15 → r = 1.67 → low.
      return adaptive(1, avg, spread, 0.35, 0.8);
    }
    case "windSpeed":
      // ≤10 km/h always high. Above: 60,65,70 (spread 10, avg 65) → r ≈ 0.15 → high;
      // 60,90,120 (spread 60, avg 90) → r ≈ 0.67 → low.
      return adaptive(10, avg, spread, 0.25, 0.5);
    case "windGusts":
      // ≤20 km/h always high. 80,90,100 (spread 20, avg 90) → r ≈ 0.22 → high.
      return adaptive(20, avg, spread, 0.3, 0.6);
    case "cape":
      // ≤50 J/kg always high. Above, larger CAPE tolerates larger spread.
      return adaptive(50, avg, spread, 0.4, 0.8);
    default: {
      // Original behavior for temperature, humidity, cloudCover, pressure, etc.
      const rel = avg !== 0 ? spread / Math.abs(avg) : 0;
      if (rel > 0.3) return "low";
      if (rel > 0.1) return "medium";
      return "high";
    }
  }
}

const ModelConfidence = ({ models, parameter, enabledModels, forecastHour }: ModelConfidenceProps) => {
  const { t } = useI18n();
  const { units } = useUnits();

  const { level, values } = useMemo(() => {
    const active = models.filter((m) => enabledModels.includes(m.model));
    if (active.length === 0) return { level: "high" as const, values: [] };

    const vals = active.map((m) => {
      let hourIndex = m.hours.indexOf(forecastHour);
      if (hourIndex === -1) {
        hourIndex = 0;
        let minDiff = Math.abs(m.hours[0] - forecastHour);
        for (let i = 1; i < m.hours.length; i++) {
          const diff = Math.abs(m.hours[i] - forecastHour);
          if (diff < minDiff) { minDiff = diff; hourIndex = i; }
        }
      }
      const raw = m[parameter][hourIndex] as number | null | undefined;
      const converted = convertValue(raw, parameter, units);
      return { model: m.model, value: converted, raw: raw ?? null, color: m.color };
    });

    // Use RAW (canonical) values for confidence so thresholds in mm / km/h / J·kg⁻¹ apply correctly.
    const rawNumbers = vals
      .map((v) => v.raw)
      .filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v));

    let level: "high" | "medium" | "low" = "high";
    if (rawNumbers.length >= 2) {
      const min = Math.min(...rawNumbers);
      const max = Math.max(...rawNumbers);
      const spread = max - min;
      const avg = rawNumbers.reduce((a, b) => a + b, 0) / rawNumbers.length;
      level = computeConfidence(parameter, avg, spread);
    }

    return { level, values: vals };
  }, [models, parameter, enabledModels, forecastHour, units]);

  const config = {
    high: { label: t("highConfidence"), color: "text-confidence-high", bg: "bg-confidence-high/10", barWidth: "w-full" },
    medium: { label: t("moderateConfidence"), color: "text-confidence-medium", bg: "bg-confidence-medium/10", barWidth: "w-2/3" },
    low: { label: t("lowConfidence"), color: "text-confidence-low", bg: "bg-confidence-low/10", barWidth: "w-1/3" },
  };

  const { label, color, bg, barWidth } = config[level];

  return (
    <div className={`rounded-xl p-4 ${bg} border border-border/30`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`font-heading font-semibold text-sm ${color}`}>{label}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted/30 mb-3">
        <div className={`h-full rounded-full ${barWidth} ${level === "high" ? "bg-confidence-high" : level === "medium" ? "bg-confidence-medium" : "bg-confidence-low"} transition-all`} />
      </div>
      <div className="flex gap-2">
        {values.map((v) => (
          <div key={v.model} className="flex-1 text-center">
            <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: v.color }} />
            <div className="text-xs text-muted-foreground font-body">{v.model}</div>
            <div className="text-sm font-heading font-semibold">
              {v.value !== null && v.value !== undefined ? smartRound(v.value, parameter, units) : "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelConfidence;
