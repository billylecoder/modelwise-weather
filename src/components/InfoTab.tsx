import { useMemo } from "react";
import { AirInfo } from "@/data/weatherApi";
import { Sun, Wind, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n";
import { parseLocalNaiveISO, addHoursNaive } from "@/lib/time";

interface InfoTabProps {
  airInfo?: AirInfo;
  dataStartTime?: string;
  forecastHour: number;
}

function uvCategory(v: number): { label: string; tone: string } {
  if (v < 3) return { label: "Low", tone: "text-emerald-300" };
  if (v < 6) return { label: "Moderate", tone: "text-amber-300" };
  if (v < 8) return { label: "High", tone: "text-orange-300" };
  if (v < 11) return { label: "Very High", tone: "text-red-400" };
  return { label: "Extreme", tone: "text-fuchsia-400" };
}

function aqiCategory(v: number): { label: string; tone: string } {
  // European AQI bands
  if (v <= 20) return { label: "Good", tone: "text-emerald-300" };
  if (v <= 40) return { label: "Fair", tone: "text-lime-300" };
  if (v <= 60) return { label: "Moderate", tone: "text-amber-300" };
  if (v <= 80) return { label: "Poor", tone: "text-orange-300" };
  if (v <= 100) return { label: "Very Poor", tone: "text-red-400" };
  return { label: "Extremely Poor", tone: "text-fuchsia-400" };
}

function dustCategory(v: number): { label: string; tone: string } {
  // µg/m³ — rough thresholds
  if (v < 20) return { label: "Clean", tone: "text-emerald-300" };
  if (v < 100) return { label: "Light", tone: "text-amber-300" };
  if (v < 300) return { label: "Moderate", tone: "text-orange-300" };
  return { label: "Heavy", tone: "text-red-400" };
}

const InfoTab = ({ airInfo, dataStartTime, forecastHour }: InfoTabProps) => {
  const { t } = useI18n();

  const base = useMemo(
    () => (dataStartTime ? parseLocalNaiveISO(dataStartTime) : null),
    [dataStartTime]
  );

  if (!airInfo) {
    return (
      <div className="glass-card rounded-xl p-5">
        <p className="text-sm text-muted-foreground font-body">No air-quality data available.</p>
      </div>
    );
  }

  const uv = airInfo.uvIndex[forecastHour] ?? null;
  const aqi = airInfo.aqi[forecastHour] ?? null;
  const dust = airInfo.dust[forecastHour] ?? null;

  const uvMax = useMemo(() => {
    let m = 0;
    for (let i = 0; i < Math.min(24, airInfo.uvIndex.length); i++) {
      const v = airInfo.uvIndex[i];
      if (v != null && v > m) m = v;
    }
    return m;
  }, [airInfo]);

  const dustPeak = useMemo(() => {
    let m = 0;
    let idx = 0;
    for (let i = 0; i < airInfo.dust.length; i++) {
      const v = airInfo.dust[i];
      if (v != null && v > m) { m = v; idx = i; }
    }
    return { value: m, idx };
  }, [airInfo]);

  const dustPeakTime = base
    ? addHoursNaive(base, dustPeak.idx)
    : null;

  const uvCat = uv != null ? uvCategory(uv) : null;
  const aqiCat = aqi != null ? aqiCategory(aqi) : null;
  const dustCat = dust != null ? dustCategory(dust) : null;

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-sm">{t("airQualityInfo")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UV Index */}
        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sun className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-body uppercase tracking-wide">{t("uvIndex")}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-3xl">
              {uv != null ? Math.round(uv) : "-"}
            </span>
            {uvCat && <span className={`text-sm font-heading ${uvCat.tone}`}>{uvCat.label}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground font-body">
            Peak today: <span className="text-foreground">{Math.round(uvMax)}</span>
          </p>
        </div>

        {/* AQI */}
        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wind className="w-4 h-4 text-primary" />
            <span className="text-xs font-body uppercase tracking-wide">{t("aqi")}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-3xl">
              {aqi != null ? Math.round(aqi) : "-"}
            </span>
            {aqiCat && <span className={`text-sm font-heading ${aqiCat.tone}`}>{aqiCat.label}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground font-body">European AQI scale</p>
        </div>

        {/* Saharan Dust */}
        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-body uppercase tracking-wide">{t("dust")}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-3xl">
              {dust != null ? Math.round(dust) : "-"}
            </span>
            <span className="text-xs text-muted-foreground font-body">µg/m³</span>
            {dustCat && <span className={`text-sm font-heading ${dustCat.tone}`}>{dustCat.label}</span>}
          </div>
          {dustPeak.value > 0 && dustPeakTime && (
            <p className="text-[11px] text-muted-foreground font-body">
              Peak: <span className="text-foreground">{Math.round(dustPeak.value)} µg/m³</span> at{" "}
              {String(dustPeakTime.hour).padStart(2, "0")}h (+{dustPeak.idx}h)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoTab;
