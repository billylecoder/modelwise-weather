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
import { parseLocalNaiveISO, addHoursNaive } from "@/lib/time";
import { useI18n } from "@/i18n";

interface HourlyForecastProps {
  models: ModelForecast[];
  enabledModels: string[];
  dataStartTime?: string;
}

const HourlyForecast = ({ models, enabledModels, dataStartTime }: HourlyForecastProps) => {
  const { units } = useUnits();
  const { t } = useI18n();

  const base = useMemo(
    () => (dataStartTime ? parseLocalNaiveISO(dataStartTime) : null),
    [dataStartTime]
  );

  // Find the index closest to "now" in the location's local timezone.
  const startIdx = useMemo(() => {
    if (!base || models.length === 0) return 0;
    const hours = models[0].hours;
    const now = new Date();
    // Treat browser-local now as wall-clock for comparison purposes.
    // It's an approximation, but acceptable since we just need the right hour bucket.
    const target = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: 0,
    };
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < hours.length; i++) {
      const t = addHoursNaive(base, hours[i]);
      const diff = Math.abs(
        Date.UTC(t.year, t.month - 1, t.day, t.hour) -
          Date.UTC(target.year, target.month - 1, target.day, target.hour)
      );
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }, [base, models]);

  const hours = useMemo(() => {
    const result = [];
    const total = models[0]?.hours.length ?? 0;
    for (let i = startIdx; i < Math.min(startIdx + 24, total); i++) {
      result.push(summarizeHour(models, enabledModels, i));
    }
    return result;
  }, [models, enabledModels, startIdx]);

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
            const Icon = pickHourIcon(h);
            const tempC = h.temp;
            const tempDisplay =
              tempC != null
                ? roundHalfUp(convertValue(tempC, "temperature", units) ?? tempC)
                : null;
            const humDisplay = h.humidity != null ? roundHalfUp(h.humidity) : null;
            const cloudDisplay = h.cloud != null ? roundHalfUp(h.cloud) : null;
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
                className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg bg-muted/20 border border-border/30 min-w-[64px]"
              >
                <span className="text-[10px] text-muted-foreground font-body">
                  {String(time.hour).padStart(2, "0")}h
                </span>
                <Icon className="w-5 h-5 text-primary" />
                <span className="font-heading font-bold text-sm">
                  {tempDisplay != null ? `${tempDisplay}${tempUnit}` : "-"}
                </span>
                <span className="text-[10px] text-muted-foreground font-body">
                  {precipDisplay != null && precipDisplay > 0
                    ? `${precipDisplay}${precipUnit}`
                    : cloudDisplay != null
                    ? `${cloudDisplay}%`
                    : "-"}
                </span>
                {windDisplay != null && (
                  <span className="text-[10px] text-muted-foreground font-body flex items-center gap-0.5">
                    <Wind className="w-2.5 h-2.5" />
                    {windDisplay}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground font-body">
                  {humDisplay != null ? `${humDisplay}%` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function pickHourIcon(h: { precip: number | null; cloud: number | null; wind: number | null; gusts: number | null }) {
  const rl = h.precip != null ? rainLevel(h.precip) : "none";
  const cl = h.cloud != null ? cloudLevel(h.cloud) : "sunny";
  // Priority: precipitation > light → rain symbol overrides clouds
  if (rl === "torrential" || rl === "heavy") return CloudRainWind;
  if (rl === "moderate") return CloudRain;
  if (rl === "light") return CloudRain;
  if (rl === "drizzle") return CloudDrizzle;
  // Wind icon takes precedence over plain cloud display when very windy
  if (shouldShowWind(h.wind, h.gusts)) return Wind;
  if (cl === "sunny") return Sun;
  if (cl === "partly") return CloudSun;
  if (cl === "mostly") return Cloud;
  return Cloudy;
}

export default HourlyForecast;
