import { useMemo } from "react";
import { ModelForecast } from "@/data/weatherApi";
import {
  summarizeHour,
  rainLevel,
  cloudLevel,
  roundHalfUp,
  shouldShowWind,
} from "@/lib/forecastSymbols";
import { useUnits } from "@/contexts/UnitsContext";
import { convertValue, smartRound, getUnitLabel } from "@/lib/units";
import { parseLocalNaiveISO, addHoursNaive } from "@/lib/time";
import { useI18n } from "@/i18n";

interface HourlyForecastProps {
  models: ModelForecast[];
  enabledModels: string[];
  dataStartTime?: string;
}

// Very rough day/night heuristic — no sunrise data available inline.
// 06:00–19:59 = day, else night. Good enough for the emoji swap.
function isNightHour(h: number): boolean {
  return h < 6 || h >= 20;
}

function pickHourEmoji(
  h: { precip: number | null; cloud: number | null; wind: number | null; gusts: number | null; snow?: number | null },
  night: boolean
): string {
  const rl = h.precip != null ? rainLevel(h.precip) : "none";
  const cl = h.cloud != null ? cloudLevel(h.cloud) : "sunny";
  const snowing = (h.snow ?? 0) > 0.05;

  if (snowing) return "🌨️";
  if (rl === "torrential" || rl === "heavy") return "⛈️";
  if (rl === "moderate") return "🌧️";
  if (rl === "light") return night ? "🌧️" : "🌦️";
  if (rl === "drizzle") return night ? "🌧️" : "🌦️";

  if (shouldShowWind(h.wind, h.gusts)) return "💨";

  if (night) {
    if (cl === "sunny") return "🌙";
    if (cl === "partly") return "🌙";
    if (cl === "mostly") return "☁️";
    return "☁️";
  }
  if (cl === "sunny") return "☀️";
  if (cl === "partly") return "🌤️";
  if (cl === "mostly") return "⛅";
  return "☁️";
}

const HourlyForecast = ({ models, enabledModels, dataStartTime }: HourlyForecastProps) => {
  const { units } = useUnits();
  const { t } = useI18n();

  const base = useMemo(
    () => (dataStartTime ? parseLocalNaiveISO(dataStartTime) : null),
    [dataStartTime]
  );

  const startIdx = useMemo(() => {
    if (!base || models.length === 0) return 0;
    const hours = models[0].hours;
    const now = new Date();
    const target = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
    };
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < hours.length; i++) {
      const tt = addHoursNaive(base, hours[i]);
      const diff = Math.abs(
        Date.UTC(tt.year, tt.month - 1, tt.day, tt.hour) -
          Date.UTC(target.year, target.month - 1, target.day, target.hour)
      );
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return best;
  }, [base, models]);

  const sourceModels = useMemo(() => {
    const ecmwf = models.find((m) => m.model === "ECMWF");
    return ecmwf ? ["ECMWF"] : enabledModels;
  }, [models, enabledModels]);

  const hours = useMemo(() => {
    const result = [];
    const total = models[0]?.hours.length ?? 0;
    for (let i = startIdx; i < Math.min(startIdx + 24, total); i++) {
      const summary = summarizeHour(models, sourceModels, i);
      // Attach snowfall if available
      const snowVals = models
        .filter((m) => sourceModels.includes(m.model))
        .map((m) => (m.snowfall as (number | null)[] | undefined)?.[i])
        .filter((v): v is number => v != null);
      const snow = snowVals.length ? snowVals.reduce((a, b) => a + b, 0) / snowVals.length : null;
      result.push({ ...summary, snow });
    }
    return result;
  }, [models, sourceModels, startIdx]);

  if (!base || hours.length === 0) return null;

  const tempUnit = getUnitLabel("temperature", units, "°C");
  const windUnit = getUnitLabel("windSpeed", units, "km/h");
  const precipUnit = getUnitLabel("precipitation", units, "mm");

  return (
    <div className="glass-card rounded-xl p-5">
      <h2 className="font-heading font-semibold text-sm mb-4">{t("hourlyForecast")}</h2>
      <div className="overflow-x-auto -mx-2">
        <div className="flex gap-2 px-2 min-w-max">
          {hours.map((h) => {
            const time = addHoursNaive(base, models[0].hours[h.hourIdx]);
            const night = isNightHour(time.hour);
            const emoji = pickHourEmoji(h, night);
            const tempC = h.temp;
            const tempDisplay =
              tempC != null
                ? roundHalfUp(convertValue(tempC, "temperature", units) ?? tempC)
                : null;
            const humDisplay = h.humidity != null ? roundHalfUp(h.humidity) : null;
            const windDisplay =
              h.wind != null
                ? smartRound(convertValue(h.wind, "windSpeed", units) ?? h.wind, "windSpeed", units)
                : null;
            const precipDisplay =
              h.precip != null
                ? smartRound(
                    convertValue(h.precip, "precipitation", units) ?? h.precip,
                    "precipitation",
                    units
                  )
                : null;
            return (
              <div
                key={h.hourIdx}
                className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg bg-muted/20 border border-border/30 min-w-[80px]"
              >
                <span className="text-[10px] text-muted-foreground font-body">
                  {String(time.hour).padStart(2, "0")}:00
                </span>
                <span className="text-2xl leading-none py-0.5" aria-hidden="true">{emoji}</span>
                <span className="font-heading font-bold text-sm">
                  {tempDisplay != null ? `${tempDisplay}${tempUnit}` : "-"}
                </span>
                <span className="text-[10px] text-muted-foreground font-body">
                  {precipDisplay != null && precipDisplay > 0
                    ? `${precipDisplay} ${precipUnit} ${t("unitRain")}`
                    : `0% ${t("unitRain")}`}
                </span>
                {windDisplay != null && (
                  <span className="text-[10px] text-muted-foreground font-body">
                    {windDisplay} {windUnit}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground font-body">
                  {humDisplay != null ? `${humDisplay}% ${t("unitHumShort")}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HourlyForecast;
