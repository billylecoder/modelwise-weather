import { useMemo } from "react";
import { ModelForecast } from "@/data/weatherApi";
import {
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSun,
  Cloud,
  Cloudy,
  Sun,
  Wind,
} from "lucide-react";
import {
  summarizeHour,
  rainLevel,
  cloudLevel,
  roundHalfUp,
  shouldShowWind,
} from "@/lib/forecastSymbols";
import { useUnits } from "@/contexts/UnitsContext";
import { convertValue, smartRound, getUnitLabel } from "@/lib/units";
import { parseLocalNaiveISO, addHoursNaive, formatDateShort } from "@/lib/time";
import { useI18n } from "@/i18n";

interface DailyForecastProps {
  models: ModelForecast[];
  enabledModels: string[];
  dataStartTime?: string;
}

interface DaySummary {
  dateLabel: string;
  tempLow: number | null;
  tempHigh: number | null;
  precipTotal: number;
  windAvg: number | null;
  gustsAvg: number | null;
  cloudAvg: number | null;
  hasAnyData: boolean;
}

const DailyForecast = ({ models, enabledModels, dataStartTime }: DailyForecastProps) => {
  const { units } = useUnits();
  const { t } = useI18n();

  const base = useMemo(
    () => (dataStartTime ? parseLocalNaiveISO(dataStartTime) : null),
    [dataStartTime]
  );

  const days: DaySummary[] = useMemo(() => {
    if (!base || models.length === 0) return [];
    const hoursArr = models[0].hours;
    // Group hour indices by local calendar day
    const groups = new Map<string, number[]>();
    for (let i = 0; i < hoursArr.length; i++) {
      const t = addHoursNaive(base, hoursArr[i]);
      const key = `${t.year}-${t.month}-${t.day}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    }
    const ordered = Array.from(groups.entries()).slice(0, 5);
    return ordered.map(([_, idxs]) => {
      const temps: number[] = [];
      let precip = 0;
      const winds: number[] = [];
      const gusts: number[] = [];
      const clouds: number[] = [];
      for (const i of idxs) {
        const s = summarizeHour(models, enabledModels, i);
        if (s.temp != null) temps.push(s.temp);
        if (s.precip != null) precip += s.precip;
        if (s.wind != null) winds.push(s.wind);
        if (s.gusts != null) gusts.push(s.gusts);
        if (s.cloud != null) clouds.push(s.cloud);
      }
      const firstHour = idxs[0];
      const t = addHoursNaive(base, hoursArr[firstHour]);
      return {
        dateLabel: formatDateShort(t),
        tempLow: temps.length ? Math.min(...temps) : null,
        tempHigh: temps.length ? Math.max(...temps) : null,
        precipTotal: precip,
        windAvg: winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : null,
        gustsAvg: gusts.length ? gusts.reduce((a, b) => a + b, 0) / gusts.length : null,
        cloudAvg: clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : null,
        hasAnyData: temps.length > 0,
      };
    }).filter((d) => d.hasAnyData);
  }, [base, models, enabledModels]);

  if (days.length === 0) return null;

  const tempUnit = getUnitLabel("temperature", units, "°C");
  const windUnit = getUnitLabel("windSpeed", units, "km/h");
  const precipUnit = getUnitLabel("precipitation", units, "mm");

  return (
    <div className="glass-card rounded-xl p-5">
      <h2 className="font-heading font-semibold text-sm mb-4">{t("fiveDayForecast")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {days.map((d) => {
          const { primary: Primary, secondary: Secondary } = pickDayIcons(d);
          const lo = d.tempLow != null ? roundHalfUp(convertValue(d.tempLow, "temperature", units) ?? d.tempLow) : null;
          const hi = d.tempHigh != null ? roundHalfUp(convertValue(d.tempHigh, "temperature", units) ?? d.tempHigh) : null;
          const precip = smartRound(
            convertValue(d.precipTotal, "precipitation", units) ?? d.precipTotal,
            "precipitation",
            units
          );
          const wind =
            d.windAvg != null
              ? smartRound(convertValue(d.windAvg, "windSpeed", units) ?? d.windAvg, "windSpeed", units)
              : null;
          return (
            <div
              key={d.dateLabel}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/20 border border-border/30"
            >
              <span className="text-xs text-muted-foreground font-body">{d.dateLabel}</span>
              <div className="flex items-center gap-1">
                <Primary className="w-6 h-6 text-primary" />
                {Secondary && <Secondary className="w-4 h-4 text-amber-300" />}
              </div>
              <div className="flex items-baseline gap-1.5">
                {hi != null && <span className="font-heading font-bold text-base">{hi}{tempUnit}</span>}
                {lo != null && <span className="text-xs text-muted-foreground font-body">{lo}{tempUnit}</span>}
              </div>
              {precip > 0 && (
                <span className="text-[10px] text-muted-foreground font-body">
                  {precip}{precipUnit}
                </span>
              )}
              {wind != null && (
                <span className="text-[10px] text-muted-foreground font-body flex items-center gap-0.5">
                  <Wind className="w-2.5 h-2.5" />
                  {wind} {windUnit}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function pickDayIcons(d: DaySummary): {
  primary: React.ComponentType<any>;
  secondary?: React.ComponentType<any>;
} {
  const rl = rainLevel(d.precipTotal);
  const cl = d.cloudAvg != null ? cloudLevel(d.cloudAvg) : "sunny";
  // Heavy/torrential rain → rain only
  if (rl === "torrential") return { primary: CloudRainWind };
  if (rl === "heavy") return { primary: CloudRainWind };
  if (rl === "moderate") return { primary: CloudRain };
  // Drizzle/light → rain (+ sun if sunny enough)
  if (rl === "light" || rl === "drizzle") {
    const Rain = rl === "drizzle" ? CloudDrizzle : CloudRain;
    if (cl === "sunny" || cl === "partly") return { primary: Rain, secondary: Sun };
    return { primary: Rain };
  }
  // No rain → cloud/sun by cover (no sun when little sun: mostly/cloudy)
  if (shouldShowWind(d.windAvg, d.gustsAvg)) return { primary: Wind };
  if (cl === "sunny") return { primary: Sun };
  if (cl === "partly") return { primary: CloudSun };
  if (cl === "mostly") return { primary: Cloud };
  return { primary: Cloudy };
}

export default DailyForecast;
